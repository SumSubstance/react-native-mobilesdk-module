package com.sumsub.msdk.plugins.reactnative;

import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.google.gson.Gson;
import com.sumsub.sns.core.SNSActionResult;
import com.sumsub.sns.core.SNSMobileSDK;
import com.sumsub.sns.core.common.SNSLogTree;
import com.sumsub.sns.core.data.listener.SNSActionResultHandler;
import com.sumsub.sns.core.data.listener.SNSCompleteHandler;
import com.sumsub.sns.core.data.listener.SNSErrorHandler;
import com.sumsub.sns.core.data.listener.SNSEvent;
import com.sumsub.sns.core.data.listener.SNSEventHandler;
import com.sumsub.sns.core.data.listener.SNSStateChangedHandler;
import com.sumsub.sns.core.data.listener.TokenExpirationHandler;
import com.sumsub.sns.core.data.model.SNSCompletionResult;
import com.sumsub.sns.core.data.model.SNSException;
import com.sumsub.sns.core.data.model.SNSSDKState;
import com.sumsub.sns.core.data.model.SNSSupportItem;
import com.sumsub.sns.prooface.SNSProoface;
import com.sumsub.sns.core.data.model.SNSInitConfig;
import com.sumsub.sns.core.SNSMobileSDK;
import com.sumsub.sns.core.data.listener.SNSIconHandler;

import org.jetbrains.annotations.NotNull;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import kotlin.Unit;
import kotlin.jvm.functions.Function1;
import kotlin.jvm.functions.Function2;
import timber.log.Timber;

public class SNSMobileSdkReactNativeModule extends ReactContextBaseJavaModule {

    private final ReactApplicationContext reactContext;
    private volatile static String newAccessToken;
    private volatile static SNSActionResult actionResultHandlerComplete;
    @Nullable
    private volatile static SNSMobileSDK.SDK sdk;

    public SNSMobileSdkReactNativeModule(@NonNull ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @ReactMethod
    public void updateAccessToken(String accessToken) {
        Timber.d("SumSub: updateAccessToken " + accessToken + " " + this);
        newAccessToken = accessToken;
    }

    @ReactMethod
    public void onActionResultCompleted(ReadableMap args) {
        Timber.d("SumSub: onActionResultCompleted " + args);
        final String error = args.getString("error");
        final String result = args.getString("result");

        actionResultHandlerComplete = "cancel".equals(result) ? SNSActionResult.Cancel : SNSActionResult.Continue;
    }

    private void sendEvent(ReactContext reactContext,
                           String eventName,
                           @Nullable WritableMap params) {
        Timber.d("Sending event " + eventName);
        reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).emit(eventName, params);
    }

    @ReactMethod
    public void launch(final String apiUrl, final String flowName, final String accessToken, final String locale, final String supportEmail, final boolean isDebug, final ReadableMap handlers, final ReadableMap appConf, final Promise promise) {

        reactContext.runOnUiQueueThread(new Runnable() {
            @Override
            public void run() {

                try {

                    final SNSActionResultHandler actionResultHandler = handlers.hasKey("onActionResult") ?
                            new SNSActionResultHandler() {
                                @Override
                                public @NotNull
                                SNSActionResult onActionResult(@NotNull String actionId, @NotNull String actionType, @org.jetbrains.annotations.Nullable String answer, boolean allowContinuing) {
                                    Timber.d("Calling onActionResult(" + actionId + ", " + answer + ")");
                                    WritableMap map = Arguments.createMap();
                                    map.putString("actionId", actionId);
                                    map.putString("answer", answer);
                                    map.putString("actionType", (actionType != null) ? actionType : "");
                                    map.putBoolean("allowContinuing", allowContinuing);

                                    actionResultHandlerComplete = null;
                                    sendEvent(reactContext, "onActionResult", map);
                                    Timber.d("After JS callback invoked " + this);
                                    int cnt = 0;
                                    while (actionResultHandlerComplete == null) {
                                        try {
                                            Thread.sleep(100);
                                        } catch (InterruptedException e) {
                                            //no op
                                        }
                                        if (++cnt > 100) {
                                            Timber.d("Returning on timeout");
                                            return SNSActionResult.Continue;
                                        }
                                    }
                                    Timber.d("SumSub: Received: " + actionResultHandlerComplete + ' ' + Thread.currentThread().getName());
                                    return actionResultHandlerComplete;
                                }
                            } : null;

                    final SNSErrorHandler errorHandler = new SNSErrorHandler() {
                        @Override
                        public void onError(@NotNull SNSException e) {
                            Timber.d(Log.getStackTraceString(e));
                        }
                    };

                    final SNSStateChangedHandler stateChangedHandler = new SNSStateChangedHandler() {
                        @Override
                        public void onStateChanged(@NotNull SNSSDKState oldState, @NotNull SNSSDKState newState) {
                            WritableMap map = Arguments.createMap();
                            map.putString("prevStatus", oldState.getClass().getSimpleName());
                            map.putString("newStatus", newState.getClass().getSimpleName());
                            sendEvent(reactContext, "onStatusChanged", map);
                        }
                    };

                    final SNSCompleteHandler completeHandler = new SNSCompleteHandler() {
                        @Override
                        public void onComplete(@NotNull SNSCompletionResult snsCompletionResult, @NotNull SNSSDKState snssdkState) {
                            getResultToTheClient(snsCompletionResult, snssdkState, promise);
                        }
                    };

                    final SNSEventHandler eventHandler = new SNSEventHandler() {
                        @Override
                        public void onEvent(@NotNull SNSEvent snsEvent) {
                            WritableMap params = Arguments.createMap();
                            final Map<String, Object> payload = snsEvent.getPayload();
                            for (String key : payload.keySet()) {
                                if (key.equals("isCanceled") || key.equals("isCancelled")) {
                                    params.putBoolean("isCancelled", (Boolean) payload.get(key));
                                } else {
                                    params.putString(key, payload.get(key).toString());
                                }
                            }
                            WritableMap map = Arguments.createMap();
                            map.putString("eventType", upperCaseFirstLetter(snsEvent.getEventType()));
                            map.putMap("payload", params);
                            sendEvent(reactContext, "onEvent", map);
                        }
                    };

                    SNSMobileSDK.Builder builder;

                    if (flowName == null || flowName.isEmpty()) {
                        builder = new SNSMobileSDK.Builder(getCurrentActivity());
                    } else {
                        builder = new SNSMobileSDK.Builder(getCurrentActivity(), null, flowName);
                    }

                    if (apiUrl != null && !apiUrl.isEmpty()) {
                        builder.withBaseUrl(apiUrl);
                    }

                    builder
                            .withAccessToken(accessToken, new TokenExpirationHandler() {
                                @Override
                                public String onTokenExpired() {
                                    Timber.d("Calling onTokenExpired()! " + this);
                                    newAccessToken = null;

                                    sendEvent(reactContext, "onTokenExpired", null);

                                    Timber.d("After JS callback invoked " + this);
                                    int cnt = 0;
                                    while (newAccessToken == null) {
                                        try {
                                            Thread.sleep(100);
                                        } catch (InterruptedException e) {
                                            //no op
                                        }
                                        if (++cnt > 100) {
                                            Timber.d("Returning on timeout");
                                            return null;
                                        }
                                    }
                                    Timber.d("SumSub: Received new token: " + newAccessToken + ' ' + Thread.currentThread().getName());
                                    return newAccessToken;
                                }
                            })
                            .withDebug(isDebug)
                            .withLocale(new Locale(locale == null ? Locale.getDefault().getLanguage() : locale))
                            .withModules(Arrays.asList(new SNSProoface()))
                            .withCompleteHandler(completeHandler)
                            .withStateChangedHandler(stateChangedHandler)
                            .withErrorHandler(errorHandler)
                            .withActionResultHandler(actionResultHandler)
                            .withEventHandler(eventHandler)
                            .withLogTree(new SNSLogTree() {
                                @Override
                                protected void log(int priority, @Nullable String tag, @NonNull String message, @Nullable Throwable t) {
                                    WritableMap map = Arguments.createMap();
                                    map.putString("message", message);
                                    reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).emit("onLog", map);
                                }
                            });

                    String email = appConf.hasKey("email") ? appConf.getString("email") : null;
                    String phone = appConf.hasKey("phone") ? appConf.getString("phone") : null;
                    builder.withConf(new SNSInitConfig(email, phone));

                    if (supportEmail != null) {
                        SNSSupportItem supportItem = new SNSSupportItem(
                                R.string.sns_support_EMAIL_title,
                                R.string.sns_support_EMAIL_description,
                                SNSSupportItem.Type.Email,
                                supportEmail,
                                null,
                                SNSIconHandler.SNSCommonIcons.MAIL.getImageName(),
                                null
                        );
                        builder.withSupportItems(Collections.singletonList(supportItem));
                    }

                    sdk = builder.build();
                    sdk.launch();
                } catch (Exception e) {
                    Timber.e(e);
                    promise.reject(e);
                }
            }
        });

    }

    @ReactMethod
    public void dismiss() {
        reactContext.runOnUiQueueThread(new Runnable() {
            @Override
            public void run() {
                if (sdk != null) sdk.dismiss();
            }
        });
    }

    private String upperCaseFirstLetter(String s) {
        return s.substring(0, 1).toUpperCase() + s.substring(1);
    }

    private void getResultToTheClient(SNSCompletionResult snsCompletionResult, SNSSDKState snssdkState, Promise promise) {
        if (snsCompletionResult instanceof SNSCompletionResult.SuccessTermination) {
            Timber.d("Resolving promise");
            promise.resolve(getResult(true, snssdkState, null, null));
        } else if (snsCompletionResult instanceof SNSCompletionResult.AbnormalTermination) {
            Timber.d("Rejecting promise");
            SNSCompletionResult.AbnormalTermination abnormalTermination = (SNSCompletionResult.AbnormalTermination) snsCompletionResult;
            String message = abnormalTermination.getException() != null ? abnormalTermination.getException().getMessage() : null;
            if (snssdkState instanceof SNSSDKState.Failed) {
                promise.resolve(getResult(false, snssdkState, message, snssdkState.getClass().getSimpleName()));
            } else {
                promise.resolve(getResult(false, new SNSSDKState.Failed.Unknown(new Exception()), message, "Unknown"));

            }
        } else {
            promise.reject("Unknown completion result: " + snsCompletionResult.getClass().getName());
        }
    }

    private WritableMap getResult(boolean success, SNSSDKState state, String errorMsg, String errorType) {
        final WritableMap result = new WritableNativeMap();
        result.putBoolean("success", success);
        result.putString("status", state != null ? state.getClass().getSimpleName() : "Unknown");
        result.putString("errorMsg", errorMsg);
        result.putString("errorType", errorType);
        if (state instanceof SNSSDKState.ActionCompleted) {
            final SNSSDKState.ActionCompleted action = (SNSSDKState.ActionCompleted) state;
            final WritableMap actionResult = new WritableNativeMap();
            actionResult.putString("actionId", action.getActionId());
            actionResult.putString("answer", action.getAnswer() != null ? action.getAnswer() : null);
            result.putMap("actionResult", actionResult);
        }
        return result;
    }


    @NonNull
    @Override
    public String getName() {
        return "SNSMobileSDKModule";
    }
}
