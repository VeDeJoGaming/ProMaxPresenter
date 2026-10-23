The smoke-video.webm fixture is an original synthetic FFmpeg test pattern, 160×90 pixels, 15 fps, four seconds, VP8 without audio. It contains no user media or third-party footage.

Generated with: ffmpeg -f lavfi -i testsrc=size=160x90:rate=15:duration=4 -c:v libvpx -b:v 100k -pix_fmt yuv420p -an smoke-video.webm

Native verification uses the deterministic file to test decoding, pause, restart, blackout and video backgrounds. MediaRecorder on a hidden or occluded canvas can return a WebM header without any frames on some systems; that tests the recording environment rather than ProMax's playback. No encoder is included in the app or needed at test runtime.
