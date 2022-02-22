#import "MobilesdkModule.h"
#import <IdensicMobileSDK/IdensicMobileSDK.h>

@interface MobilesdkModule ()
@property (nonatomic, copy) void(^tokenExpirationOnComplete)(NSString * _Nullable newAccessToken);
@property (nonatomic, copy) void(^actionResultHandlerOnComplete)(SNSActionResultHandlerReaction);
@property (nonatomic, weak) SNSMobileSDK *sdk;
@end

@implementation MobilesdkModule

RCT_EXPORT_MODULE(SNSMobileSDKModule)

- (NSArray<NSString *> *)supportedEvents
{
    return @[@"onTokenExpired", @"onLog", @"onStatusChanged", @"onActionResult", @"onEvent"];
}

RCT_EXPORT_METHOD(launch:(NSString *)apiUrl flowName:(NSString *)flowName accessToken:(NSString *)accessToken 
                  locale:(NSString *)locale
                  supportEmail:(NSString *)supportEmail
                  debug:(BOOL)debug
                  handlers:(NSDictionary *)handlers
                  applicantConf:(NSDictionary *)applicantConf
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    SNSMobileSDK *sdk;
    
    if (!flowName || flowName.length <= 0) {
        
        SNSEnvironment environment = (apiUrl && apiUrl.length > 0) ? apiUrl : SNSEnvironmentProduction;
    
        sdk = [SNSMobileSDK setupWithAccessToken:accessToken
                                     environment:environment];
        
        if (locale) {
            sdk.locale = locale;
        }

    } else {
    
        sdk = [SNSMobileSDK setupWithBaseUrl:apiUrl
                                    flowName:flowName
                                 accessToken:accessToken
                                      locale:locale
                                supportEmail:supportEmail];
    }
    
    if (![handlers isKindOfClass:NSDictionary.class]) {
        handlers = @{};
    }
    if (![applicantConf isKindOfClass:NSDictionary.class]) {
        applicantConf = @{};
    }

    if (!sdk.isReady) {
        return resolve([self makeResult:sdk]);
    }
    
    self.sdk = sdk;

    if (debug) {
        sdk.logLevel = SNSLogLevel_Debug;
    }

    if (applicantConf[@"email"]) {
        sdk.initialEmail = applicantConf[@"email"];
    }
    if (applicantConf[@"phone"]) {
        sdk.initialPhone = applicantConf[@"phone"];
    }

    __weak typeof(self) weakSelf = self;
    
    [sdk setTokenExpirationHandler:^(void (^ _Nonnull onComplete)(NSString * _Nullable)) {
    
        weakSelf.tokenExpirationOnComplete = onComplete;
        
        [weakSelf sendEventWithName:@"onTokenExpired" body:nil];
    }];
    
    if (handlers[@"onStatusChanged"]) {

        [sdk setOnStatusDidChange:^(SNSMobileSDK * _Nonnull sdk, SNSMobileSDKStatus prevStatus) {
            
            [weakSelf sendEventWithName:@"onStatusChanged" body:@{
                @"newStatus": [sdk descriptionForStatus:sdk.status] ?: @"",
                @"prevStatus": [sdk descriptionForStatus:prevStatus] ?: @"",
            }];
        }];
    }
    
    if (handlers[@"onActionResult"]) {

        [sdk actionResultHandler:^(SNSMobileSDK * _Nonnull sdk, SNSActionResult * _Nonnull result, void (^ _Nonnull onComplete)(SNSActionResultHandlerReaction)) {
            
            weakSelf.actionResultHandlerOnComplete = onComplete;

            [weakSelf sendEventWithName:@"onActionResult" body:@{
                @"actionId": result.actionId ?: @"",
                @"actionType": result.actionType ?: @"",
                @"answer": result.answer ?: @"",
                @"allowContinuing": @(result.allowContinuing),
            }];
        }];
    }

    if (handlers[@"onLog"]) {

        [sdk logHandler:^(SNSLogLevel level, NSString * _Nonnull message) {
            NSLog(@"[Idensic] %@", message);
            
            [weakSelf sendEventWithName:@"onLog" body:@{
                @"level": @(level),
                @"message": message ?: @"",
            }];
        }];
    }

    if (handlers[@"onEvent"]) {
        
        [sdk onEvent:^(SNSMobileSDK * _Nonnull sdk, SNSEvent * _Nonnull event) {

            [weakSelf sendEventWithName:@"onEvent" body:@{
                @"eventType": [event descriptionForEventType:event.eventType] ?: @"",
                @"payload": event.payload ?: @{},
            }];
        }];
    }

    [sdk setOnDidDismiss:^(SNSMobileSDK * _Nonnull sdk) {
       
        resolve([weakSelf makeResult:sdk]);
    }];
    
    dispatch_async(dispatch_get_main_queue(), ^{
        [self applyCustomizationIfAny];
        
        [sdk present];
    });
}

RCT_EXPORT_METHOD(updateAccessToken:(NSString *)newAccessToken)
{
    if (self.tokenExpirationOnComplete) {
        dispatch_async(dispatch_get_main_queue(), ^{
            self.tokenExpirationOnComplete(newAccessToken);
            self.tokenExpirationOnComplete = nil;
        });
    }
}

RCT_EXPORT_METHOD(onActionResultCompleted:(NSDictionary *)params)
{
    SNSActionResultHandlerReaction reaction = SNSActionResultHandlerReaction_Continue;
    if ([params[@"result"] isEqualToString:@"cancel"]) {
        reaction = SNSActionResultHandlerReaction_Cancel;
    }

    if (self.actionResultHandlerOnComplete) {
        dispatch_async(dispatch_get_main_queue(), ^{
            self.actionResultHandlerOnComplete(reaction);
            self.actionResultHandlerOnComplete = nil;
        });
    }
}

RCT_EXPORT_METHOD(dismiss)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        [self.sdk dismiss];
    });
}

#pragma mark - Customization

/**
 * Usage:
 *
 * Add a class named `IdensicMobileSDKCustomization` into the main project
 * and define a static method named `apply:` that will take an instance of `SNSMobileSDK`
 *
 * For example, in Swift:
 *
 * import IdensicMobileSDK
 *
 * class IdensicMobileSDKCustomization: NSObject {
 *
 *   @objc static func apply(_ sdk: SNSMobileSDK) {
 *   }
 * }
 *
 */
- (void)applyCustomizationIfAny {
    
    NSString *className = @"IdensicMobileSDKCustomization";
    
    Class customization = [NSBundle.mainBundle classNamed:className];
    if (!customization) {
        NSString *classPrefix = [NSBundle.mainBundle objectForInfoDictionaryKey:(__bridge NSString *)kCFBundleExecutableKey];
        if (classPrefix) {
            customization = [NSBundle.mainBundle classNamed:[NSString stringWithFormat:@"%@.%@", classPrefix, className]];
        }
    }
    
    if (customization && [customization respondsToSelector:@selector(apply:)]) {
        [customization performSelector:@selector(apply:) withObject:self.sdk];
    }
}

#pragma mark - Helpers

- (NSDictionary *)makeResult:(SNSMobileSDK *)sdk {
    
    NSMutableDictionary *result = NSMutableDictionary.new;
    
    result[@"success"] = @(sdk.status != SNSMobileSDKStatus_Failed);
    result[@"status"] = [sdk descriptionForStatus:sdk.status];
    
    if (sdk.status == SNSMobileSDKStatus_Failed) {
        result[@"errorType"] = [sdk descriptionForFailReason:sdk.failReason];
        result[@"errorMsg"] = sdk.verboseStatus;
    }

    if (sdk.status == SNSMobileSDKStatus_ActionCompleted && sdk.actionResult) {
        NSMutableDictionary *actionResult = NSMutableDictionary.new;
        
        actionResult[@"actionId"] = sdk.actionResult.actionId;
        actionResult[@"actionType"] = sdk.actionResult.actionType;
        actionResult[@"answer"] = sdk.actionResult.answer;
        actionResult[@"allowContinuing"] = @(sdk.actionResult.allowContinuing);

        result[@"actionResult"] = actionResult.copy;
    }
    
    return result.copy;
}

@end
