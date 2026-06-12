(function () {
  if (window.__boaSiteBooted || window.__boaSiteLoading) return;
  window.__boaSiteLoading = true;
  var script = document.createElement("script");
  script.src = "../site.js";
  script.defer = true;
  document.head.appendChild(script);
})();
