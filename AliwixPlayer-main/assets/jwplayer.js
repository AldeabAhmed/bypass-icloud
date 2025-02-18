function gup(e){e=e.replace(/[\[]/,"\\[").replace(/[\]]/,"\\]");
var n="[\\?&]"+e+"=([^&#]*)",
l=new RegExp(n),
c=l.exec(window.location.href);
return null==c?"https://heny007.github.io/HeNy-Ben-Hamed/today-matches/aliwix.mp4":unescape(c[1])}
var video=gup("src");
var iptv=(video);
var playerInstance = jwplayer("app").setup({file:iptv,
title: 'HeNy007',autostart: "false",width: "100%",height: "100%",
tag:"HeNy007",title:"HeNy007",autostart:"true",stretching:"exactfit",autostretch:"true",
logo:{position:"bottom-left",margin:"25",file:"https://github.com/HeNy007/AliwixPlayer/raw/main/2.png",height:"25"}, 
flashplayer:"https://raw.githack.com/HeNy007/HeNy-Ben-Hamed/master/today-matches/jwplayer.flash.swf",tracks:{file:"thumbnails.vtt",kind:"thumbnails"} });
playerInstance.addButton(
    'https://raw.githubusercontent.com/HeNy007/AliwixPlayer/main/assets/download.svg',
    'Download video', 
    function() {  
    window.open(playerInstance.getPlaylistItem()['file']+'?type=video/mp4&title=Download%20video', '_blank').blur();
    //window.location.href = playerInstance.getPlaylistItem()['file'];
    },
    'download'
    );
   
   $(window).on("orientationchange", () => {
   if(screen.width > screen.height){
   // change to landscape
   } else {
   // change to portrait
   }
   });
