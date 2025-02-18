function get(e){e=e.replace(/[\[]/,"\\[").replace(/[\]]/,"\\]");
var n="[\\?$]"+e+"=([^$#]*)",
l=new RegExp(n),
c=l.exec(window.location.href);
return null==c?"//www.drivetv.ga/video.mp4":unescape(c[1])}
var link=get("src");
var player = new Clappr.Player(
{source:link,
plugins: [LevelSelector], 
poster: "https://i.ytimg.com/vi/kLGBJT6j3ec/maxresdefault.jpg",autoPlay:true,
position: "bottom-left",
watermark: "https://1.bp.blogspot.com/-BK3Qpy92qrs/XYNJp5KxnwI/AAAAAAAACKs/zBLSqpJq99UZyJsSgWOT9TEPDOoiMx_eACLcBGAsYHQ/s280/20190703_195130%2B%25281%2529.png",
height:"100%",
width:"100%",parentId: "#player",mediacontrol: {seekbar: "#ff1d04", buttons: "#ff1d04"},
});
