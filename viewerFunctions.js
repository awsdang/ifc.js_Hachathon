
// progress bar part one (loading bundle.js)

start(time);
function start(time) {
  var duration = time; // it should finish in 5 seconds !
  var st = new Date().getTime();
  var interval = setInterval(function () {
    var diff = Math.round(new Date().getTime() - st),
      val = Math.round((diff / duration) * 100);
    val = val > 100 ? 100 : val;
    document.getElementById("bundleProgress").innerText = val;
    if (diff >= duration) {
      clearInterval(interval);
    }
  }, 150);
}

// Progress Bar
var bundleProgress = document.getElementById("bundleProgress");
var filesProgress = document.getElementById("filesProgress");
var UnzipProgress = document.getElementById("UnzipProgress");
progressInterval = setInterval(function () {
  document
    .getElementById("progress")
    .setAttribute(
      "style",
      "width:" +
        (parseInt(bundleProgress.innerText) +
          parseInt(filesProgress.innerText) * 3 +
          parseInt(UnzipProgress.innerText)) /
          5 +
        "%"
    );
}, 150);

// toggler
var first_click = true;
function toggleTool(id, toggle) {
  if (first_click) {
    document.getElementById(id).classList.remove("hidden");
    document.getElementById(toggle).classList.remove("group");
    first_click = false;
  } else {
    document.getElementById(id).classList.add("hidden");
    document.getElementById(toggle).classList.add("group");
    first_click = true;
  }
}


// control burger
$(document).ready(function () {
  $("#burgerMenu").click(function () {
    $("#sidebar").toggleClass("scale-100");
    $("#burgerMenu").toggleClass("active");
    $(".line").toggleClass("active");
    $(".burger").toggleClass("w-16");

    $("#burger2sidebar").toggleClass("sidebarIcon");
  });
});
