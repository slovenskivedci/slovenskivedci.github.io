from pathlib import Path

# --- process.py: add field + area to scatter points ---
pp = Path("/Users/richtap/git/slovenskivedci/process.py")
pt = pp.read_text(encoding="utf-8")
old = '''        year_hindex_points.append("{x:%d,y:%d,name:%s,id:%s}" % (
            y, int(person['hindex']), _js_str(pname), _js_str(card_id)))'''
new = '''        year_hindex_points.append("{x:%d,y:%d,name:%s,id:%s,field:%s,area:%s}" % (
            y, int(person['hindex']), _js_str(pname), _js_str(card_id),
            _js_str(person.get("field") or ""),
            _js_str(person.get("area") or "")))'''
if old not in pt:
    raise SystemExit("process.py scatter format missing")
pp.write_text(pt.replace(old, new, 1), encoding="utf-8")
print("process.py scatter fields added")

# --- statistiky.html ---
sp = Path("/Users/richtap/git/slovenskivedci/statistiky.html")
st = sp.read_text(encoding="utf-8")

old_tip = '''          label: function(ctx) {
            var p = ctx.raw || {};
            var name = p.name || '';
            var year = p.x;
            var h = p.y;
            var parts = [];
            if (name) parts.push(name);
            if (h != null) parts.push('h ' + h);
            if (year != null) parts.push(String(year));
            return parts.join(' · ');
          }'''
new_tip = '''          title: function(items) {
            var p = (items[0] && items[0].raw) || {};
            return p.name || '';
          },
          label: function(ctx) {
            var p = ctx.raw || {};
            var parts = [];
            if (p.y != null) parts.push('h ' + p.y);
            if (p.x != null) parts.push(String(p.x));
            return parts.join(' · ');
          },
          afterLabel: function(ctx) {
            var p = ctx.raw || {};
            var extra = [p.field, p.area].filter(Boolean);
            return extra.join(' · ');
          }'''
if old_tip not in st:
    raise SystemExit("scatter tooltip missing")
st = st.replace(old_tip, new_tip, 1)

old_odbor = '''			const ctxOdbor = document.getElementById('myChartOdbor');
			const odborCounts = {{ site.data.page.odborCount }};
			const dataOdbor = {
			  labels:{{ site.data.page.odbor }} ,
			  datasets: [
				{
				  label: 'medián',
				  data: {{ site.data.page.odborMedian }},
				  borderColor: 'rgba(31, 78, 121, 0.25)',
				  backgroundColor: 'rgba(31, 78, 121, 0.85)',
				  borderWidth: 2,
				  borderRadius: 5,
				  borderSkipped: false,
				}
			  ]
			};
			const odborCountLabels = {
			  id: 'odborCountLabels',
			  afterDatasetsDraw: function(chart) {
			    var meta = chart.getDatasetMeta(0);
			    if (!meta || !meta.data) return;
			    var c = chart.ctx;
			    c.save();
			    c.fillStyle = '#666';
			    c.font = '12px Open Sans, sans-serif';
			    c.textAlign = 'center';
			    c.textBaseline = 'bottom';
			    meta.data.forEach(function(bar, i) {
			      if (!bar || odborCounts[i] == null) return;
			      c.fillText(String(odborCounts[i]), bar.x, bar.y - 3);
			    });
			    c.restore();
			  }
			};
			
			const myChartOdbor = new Chart(ctxOdbor,
			    {
  type: 'bar',
  data: dataOdbor,
  plugins: [odborCountLabels],
  options: {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 18 } },
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          afterBody: function(items) {
            if (!items || !items.length) return '';
            var i = items[0].dataIndex;
            return 'počet: ' + odborCounts[i];
          }
        }
      },
      title: { display: false }
    },
    scales: {
      x: {
        ticks: { maxRotation: 40, minRotation: 0, autoSkip: false }
      },
      y: {
        title: { display: true, text: 'medián h-index' },
        beginAtZero: true
      }
    }
  },
});'''

new_odbor = '''			const ctxOdbor = document.getElementById('myChartOdbor');
			const odborCounts = {{ site.data.page.odborCount }};
			const odborMins = {{ site.data.page.odborMin }};
			const odborMaxs = {{ site.data.page.odborMax }};
			const odborMedians = {{ site.data.page.odborMedian }};
			const odborRange = [];
			for (var oi = 0; oi < odborMins.length; oi++) odborRange.push([odborMins[oi], odborMaxs[oi]]);
			const dataOdbor = {
			  labels:{{ site.data.page.odbor }} ,
			  datasets: [
				{
				  label: 'rozsah',
				  data: odborRange,
				  borderColor: 'rgba(31, 78, 121, 0.7)',
				  backgroundColor: 'rgba(31, 78, 121, 0.28)',
				  borderWidth: 1,
				  borderRadius: 4,
				  borderSkipped: false,
				  barPercentage: 0.45,
				  categoryPercentage: 0.7,
				  order: 2
				},
				{
				  type: 'line',
				  label: 'medián',
				  data: odborMedians,
				  showLine: false,
				  pointStyle: 'circle',
				  pointRadius: 4.5,
				  pointHoverRadius: 6,
				  pointBackgroundColor: '#1f4e79',
				  pointBorderColor: '#1f4e79',
				  order: 1
				}
			  ]
			};
			const odborCountLabels = {
			  id: 'odborCountLabels',
			  afterDatasetsDraw: function(chart) {
			    var meta = chart.getDatasetMeta(0);
			    if (!meta || !meta.data) return;
			    var c = chart.ctx;
			    c.save();
			    c.fillStyle = '#666';
			    c.font = '12px Open Sans, sans-serif';
			    c.textAlign = 'center';
			    c.textBaseline = 'bottom';
			    meta.data.forEach(function(bar, i) {
			      if (!bar || odborCounts[i] == null) return;
			      c.fillText(String(odborCounts[i]), bar.x, bar.y - 3);
			    });
			    c.restore();
			  }
			};
			
			const myChartOdbor = new Chart(ctxOdbor,
			    {
  type: 'bar',
  data: dataOdbor,
  plugins: [odborCountLabels],
  options: {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 18 } },
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: false,
        filter: function(item) { return item.datasetIndex === 0; },
        callbacks: {
          label: function(ctx) {
            var i = ctx.dataIndex;
            return 'min ' + odborMins[i] + ' · medián ' + odborMedians[i] + ' · max ' + odborMaxs[i];
          },
          afterBody: function(items) {
            if (!items || !items.length) return '';
            var i = items[0].dataIndex;
            return 'počet ' + odborCounts[i];
          }
        }
      },
      title: { display: false }
    },
    scales: {
      x: {
        ticks: { maxRotation: 40, minRotation: 0, autoSkip: false }
      },
      y: {
        title: { display: true, text: 'h-index' },
        beginAtZero: true
      }
    }
  },
});'''

if old_odbor not in st:
    raise SystemExit("odbor chart block missing")
st = st.replace(old_odbor, new_odbor, 1)
sp.write_text(st, encoding="utf-8")
print("statistiky.html updated")
