import {NativeEventEmitter, NativeModules} from 'react-native';

const {SNSMobileSDKModule} = NativeModules;

const SUMSUB_SDK_HANDLERS = {
    'onStatusChanged': null,
    'onEvent': null,
    'onLog': null,
    'onActionResult': 'onActionResultCompleted'
}

var _currentInstance = null;

function SNSMobileSDK(sdkConf) {
    this.sdkConf = sdkConf
}

SNSMobileSDK.prototype.dismiss = function () {
    SNSMobileSDKModule.dismiss()
}

SNSMobileSDK.prototype.getNewAccessToken = function () {
    _currentInstance.sdkConf.tokenExpirationHandler()
        .then(newToken => {
            SNSMobileSDKModule.updateAccessToken(newToken)
        })
        .catch(err => {
            console.error(err)
            SNSMobileSDKModule.updateAccessToken(null)
        })
}


SNSMobileSDK.prototype.launch = function () {
    
    if (_currentInstance) {
        return Promise.reject(new Error("Aborted since another instance is in use!"));
    }

    _currentInstance = this

    const eventEmitter = new NativeEventEmitter(NativeModules.SNSMobileSDKModule);

    var listeners = []

    listeners.push(eventEmitter.addListener('onTokenExpired', () => {
        console.log("Token expired event received")
        _currentInstance.getNewAccessToken()
    }));

    Object.keys(this.sdkConf.handlers).forEach(handlerName => {

        var handler = this.sdkConf.handlers[handlerName]

        if (!handler) {
            return;
        }

        var completionAction = SUMSUB_SDK_HANDLERS[handlerName];

        listeners.push(eventEmitter.addListener(handlerName, (event) => {
            // console.log("Invoked ["+handlerName+"] with " + JSON.stringify(event))

            if (!completionAction) {
                handler(event);
                return;
            }

            var onComplete = function (error, result) {
                SNSMobileSDKModule[completionAction]({
                    "error": error, 
                    "result": result
                });
            }

            handler(event)
                .then(result => {
                    onComplete(null, result)
                })
                .catch(error => {
                    onComplete(error || new Error("rejected"), null)
                })
        }));
    })

    const cleanup = () => {
        _currentInstance = null
        listeners.forEach(listener => {
            listener.remove()
        })
    }

    return SNSMobileSDKModule.launch(
        this.sdkConf.apiUrl, 
        this.sdkConf.flowName, 
        this.sdkConf.accessToken, 
        this.sdkConf.locale, 
        this.sdkConf.supportEmail, 
        this.sdkConf.debug,
        this.sdkConf.hasHandlers,
        this.sdkConf.applicantConf
    )
    .catch(error => {
        cleanup()
        return Promise.reject(error)
     })
     .then(result => {
        cleanup()
        return result
     })
};

function Builder(apiUrl, flowName) {
    this.apiUrl = apiUrl;
    this.flowName = flowName;
    this.debug = false;
    this.handlers = {};
    this.applicantConf = {};
    return this;
}

Builder.prototype.withAccessToken = function (accessToken, expirationHandler) {
    this.accessToken = accessToken
    if (!expirationHandler || typeof expirationHandler !== 'function') {
        throw new Error('Invalid parameter, "expirationHandler" must be a function')
    }
    this.tokenExpirationHandler = expirationHandler
    return this
}

Builder.prototype.withHandlers = function (handlers) {

    if (!handlers || typeof handlers !== 'object') {
        throw new Error('Invalid parameter, "handlers" must be a hash')
    }

    Object.keys(SUMSUB_SDK_HANDLERS).forEach(handlerName => {
        var handler = handlers[handlerName]
        if (handler) {
            if (typeof handler !== 'function') {
                throw new Error('Invalid parameter, "'+handlerName+'" must be a function, not '+typeof(handler))
            }
            this.handlers[handlerName] = handler;
        }
    })

    return this
}

Builder.prototype.withDebug = function (flag) {
    if (typeof flag !== 'boolean') {
        throw new Error('Invalid parameter, "withDebug" expects a boolean');
    }
    this.debug = flag;
    return this;
}

Builder.prototype.withLocale = function (locale) {
    if (typeof locale !== 'string') {
        throw new Error('Invalid parameter, "locale" must be a string');
    }
    this.locale = locale;
    return this;
}

Builder.prototype.withSupportEmail = function (supportEmail) {
    if (typeof supportEmail !== 'string') {
        throw new Error('Invalid parameter, "supportEmail" must be a string');
    }
    this.supportEmail = supportEmail;
    return this;
}

Builder.prototype.withApplicantConf = function (applicantConf) {

    if (!applicantConf || typeof applicantConf !== 'object') {
        throw new Error('Invalid parameter, "withApplicantConf" expects a hash')
    }

    this.applicantConf = applicantConf
    return this
}

Builder.prototype.withBaseUrl = function (apiUrl) {
    if (typeof apiUrl !== 'string') {
        throw new Error('Invalid parameter, "baseUrl" must be a string');
    }
    this.apiUrl = apiUrl;
    return this;
}

Builder.prototype.onTestEnv = function () {
    return this.withBaseUrl("https://test-api.sumsub.com")
}

Builder.prototype.build = function () {

    var hasHandlers = {}
    Object.keys(this.handlers).forEach(name => {
        hasHandlers[name] = true;
    })

    return new SNSMobileSDK({
        apiUrl: this.apiUrl,
        flowName: this.flowName,
        accessToken: this.accessToken,
        tokenExpirationHandler: this.tokenExpirationHandler,
        handlers: this.handlers,
        hasHandlers: hasHandlers,
        locale: this.locale,
        supportEmail: this.supportEmail,
        applicantConf: this.applicantConf,
        debug: this.debug
    });
}


module.exports = {
    init: function (accessToken, expirationHandler) {
        return new Builder().withAccessToken(accessToken, expirationHandler)
    },
    Builder: function (baseUrl, flowName) {
        return new Builder(baseUrl, flowName);
    },
    reset: function() {
        _currentInstance = null
    }
};

