function gup(e){e=e.replace(/[\[]/,"\\[").replace(/[\]]/,"\\]");

var n="[\\?$]"+e+"=([^$#]*)",

l=new RegExp(n),

c=l.exec(window.location.href);

return null==c?"https://s6.tntendirect.com/tf1/live/playlist.m3u8":unescape(c[1])}

var link=gup("src");

        var video = document.getElementById('video');

        if(Hls.isSupported()) {

          var hls = new Hls();

          hls.loadSource(link);

          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED,function() {

            video.play();

        });

      }

          else if (video.canPlayType('application/vnd.apple.mpegurl')) {

          video.src = 'https://adtv.ercdn.net/adsport1/adsport1_720p.m3u8';

          video.addEventListener('loadedmetadata',function() {

            video.play();

          });

        }
