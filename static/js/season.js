// Seasonal modes, decided by the visitor's local date. Inlined into <head>
// (see layouts/partials/head.html) so the right look paints without a flash.
// winter: 1 Nov - 31 Mar, april: 1 Apr only. Preview with ?season=winter|april|off.
function seasonFor(date, override) {
  if (override === 'winter' || override === 'april') return override;
  if (override === 'off') return null;
  var month = date.getMonth(); // 0 = Jan
  if (month === 3 && date.getDate() === 1) return 'april';
  if (month >= 10 || month <= 2) return 'winter';
  return null;
}

function yearsSince(founded, date) {
  return date.getFullYear() - founded;
}

if (typeof document !== 'undefined') {
  (function () {
    var now = new Date();
    var season = seasonFor(now, new URLSearchParams(location.search).get('season'));
    if (season) document.documentElement.setAttribute('data-season', season);
    document.addEventListener('DOMContentLoaded', function () {
      var els = document.querySelectorAll('[data-years-since]');
      for (var i = 0; i < els.length; i++) {
        els[i].textContent = yearsSince(Number(els[i].getAttribute('data-years-since')), now);
      }
    });
  })();
}

if (typeof module !== 'undefined') module.exports = { seasonFor: seasonFor, yearsSince: yearsSince };
