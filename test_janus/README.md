
# test janus attach, register 

# run ./loop.js

# install step
## mac use npm install

## linux need build node-webrtc and build-webrtc for error

```
node: symbol lookup error:
wrtc/v0.0.61/Release/node-v48-linux-x64/wrtc.node: undefined symbol: XOpenDisplay

built libwebrtc (using the build-webrtc module)
adding include_pulse_audio=0 and include_internal_video_render=0 in jakelib/environment.js.

npm install
npm run buil-webrtc
npm run copy-webrtc-headers
拷贝 编译的 lib/libwebrtc.a 和 include 目录到 node-webrtc

```
### build-webrtc
git clone https://github.com/markandrus/build-webrtc.git
npm install
修改 third_party/webrtc include 和 lib 从 build-webrtc 中

npm install --build-from-source