require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "react-native-mobilesdk-module"
  s.version      = package["version"]
  s.summary      = package["title"]
  s.description  = package["description"]
  s.homepage     = "https://sumsub.com"
  s.license      = "MIT"
  s.authors      = { "SumSub" => "support@sumsub.com" }
  s.platforms    = { :ios => "9.0" }
  s.source       = { :http => "file:" + __dir__ + "/" }

  s.source_files = "ios/**/*.{h,c,m,swift}"
  s.requires_arc = true

  s.dependency "React"
  s.dependency "IdensicMobileSDK", "=1.18.4"
end
