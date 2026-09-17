/* list filters — shared; safe with persistent header shell */
window.SV = window.SV || {};
if (!window.SV.listFiltersBound) {
window.SV.listFiltersBound = true;

	$(document).ready(function(){

         updateSelectedNumber();

		 function showAll() {
			//$(".selected").removeClass("selected");
			$(".entry").fadeIn();
			//$(".toggle").css("background-color", "white");

		}

	  function normalizeDiacritics(s){
		return (s || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
	  }

	  function entryMatchesSearch($el, qNorm){
		if (!qNorm) return true;
		var tokens = qNorm.split(/\s+/).filter(Boolean);
		if (!tokens.length) return true;
		var hay = normalizeDiacritics(
		  $el.text() + " " + ($el.attr("class") || "") + " " + ($el.attr("id") || "")
		);
		for (var i = 0; i < tokens.length; i++){
		  if (hay.indexOf(tokens[i]) === -1) return false;
		}
		return true;
	  }

	  function updateSelectedNumber(){
		  var numItems = $('.showed').length;
		  var total = (window.SV && SV.totalScholars) ? SV.totalScholars : $(".entry").length;
		  $("#scientists-count").html("POČET VEDCOV: " + numItems + " /  " + total + " ");
      }


	 function filter(){


		 var field = ($("#filter-field").html() || "").trim();
		 var position = $("#filter-position").html();
		 var country = $("#filter-country").html();
		 var affiliation = $("#filter-affiliation").html();
		 var city = $("#filter-city").html();
     var sex = $("#filter-sex").html();
     var area = ($("#filter-area").html() || "").trim();

        var qNorm = normalizeDiacritics($("#header-search").val() || "");

		//  alert(field+" "+position);



		 var toHide = $(".entry").filter(function() {
			  var keep = true;


			  if (field!="" &&   !$(this).hasClass("field-"+field)  ){
				  keep=false;
			  }
			  if (position!="" &&   !$(this).hasClass("position-"+position)  ){
				  keep=false;
			  }
			  if (country!="" &&   !$(this).hasClass("country-"+country)  ){
				  keep=false;
			  }
			  if (city!="" &&   !$(this).hasClass("city-"+city)  ){
				  keep=false;
			  }
			  if (affiliation!="" &&   !$(this).hasClass("affiliation-"+affiliation)  ){
				  keep=false;
			  }
        if (sex!="" &&   !$(this).hasClass("sex-"+sex)  ){
				  keep=false;
			  }
			  if (area!="" &&   !$(this).hasClass("area-"+area)  ){
				  keep=false;
			  }



			  if (!entryMatchesSearch($(this), qNorm)){
				  keep=false;
			  }
			  return keep==false;
			});

		  //$(".entry").fideIn();
		  $(".entry").addClass("showed");
		  toHide.removeClass("showed");
		  toHide.hide();
		  $(".showed").fadeIn();

		  updateSelectedNumber();

		 //return common;
	 }


//<span id="filter-field"></span>
//		<span id="filter-position"></span>
//		<span id="filter-affiliation"></span>
//		<span id="filter-country"></span>
//		<span id="filter-city"></span>

	  $(document).on("click", ".toggle-field", function(){
		if($(this).hasClass("selected")){
			$("#filter-field").html("");
			$(".toggle-field").removeClass("selected");

        }else{
			var id = $(this).attr('id');
			field = id.split(":")[6];
			$("#filter-field").html(field);
			$(".toggle-field").removeClass("selected");
			$(".toggle-field-"+field).addClass("selected");
		}
		filter();
	  });


	  $(document).on("click", ".toggle-area", function(){
		if($(this).hasClass("selected")){
			$("#filter-area").html("");
			$(".toggle-area").removeClass("selected");
        }else{
			var id = $(this).attr('id');
			var areaVal = id.split(":")[6];
			$("#filter-area").html(areaVal);
			$(".toggle-area").removeClass("selected");
			$(".toggle-area-"+areaVal).addClass("selected");
		}
		filter();
	  });

	  $(document).on("click", ".toggle-position", function(){
		if($(this).hasClass("selected")){
			$("#filter-position").html("");
			$(".toggle-position").removeClass("selected");

        }else{
			var id = $(this).attr('id');
			position = id.split(":")[5];
			$("#filter-position").html(position);
			$(".toggle-position").removeClass("selected");
			$(".toggle-position-"+position).addClass("selected");
		}
		filter();
	  });

	  $(document).on("click", ".toggle-affiliation", function(){
		if($(this).hasClass("selected")){
			$("#filter-affiliation").html("");
			$(".toggle-affiliation").removeClass("selected");

        }else{
			var id = $(this).attr('id');
			affiliation = id.split(":")[3];
			$("#filter-affiliation").html(affiliation);
			$(".toggle-affiliation").removeClass("selected");
			$(".toggle-affiliation-"+affiliation).addClass("selected");
		}
		filter();
	  });


	  $(document).on("click", ".toggle-country", function(){
		if($(this).hasClass("selected")){
			$("#filter-country").html("");
			$(".toggle-country").removeClass("selected");

        }else{
			var id = $(this).attr('id');
			country = id.split(":")[2];
			$("#filter-country").html(country);
			$(".toggle-country").removeClass("selected");
			$(".toggle-country-"+country).addClass("selected");
		}
		filter();
	  });

	  $(document).on("click", ".toggle-city", function(){
		if($(this).hasClass("selected")){
			$("#filter-city").html("");
			$(".toggle-city").removeClass("selected");

        }else{
			var id = $(this).attr('id');
			city = id.split(":")[4];
			$("#filter-city").html(city);
			$(".toggle-city").removeClass("selected");
			$(".toggle-city-"+city).addClass("selected");
		}
		filter();
	  });

    $(".sex-chip").on("click", function(e){
      e.preventDefault();
      var sex = $(this).attr("data-sex");
      var cur = ($("#filter-sex").html() || "").trim();
      if(cur === sex){
        $("#filter-sex").html("");
        $(".sex-chip").removeClass("selected");
      } else {
        $("#filter-sex").html(sex);
        $(".sex-chip").removeClass("selected");
        $(this).addClass("selected");
      }
      // iOS can leave :hover sticky after tap; force style refresh
      this.blur();
      filter();
    });







	  var searchTimer = null;
	  function syncSearchClear(){
		var v = $("#header-search").val() || "";
		$("#header-search-clear").prop("hidden", v.length === 0);
	  }
	  function runSearchFilter(){
		filter();
		var v = ($("#header-search").val() || "").trim();
		try {
		  var url = new URL(window.location.href);
		  if (v) url.searchParams.set("q", v);
		  else url.searchParams.delete("q");
		  history.replaceState(null, "", url.pathname + url.search + url.hash);
		} catch (e) {}
	  }
	  $("#header-search").on("input", function(){
		syncSearchClear();
		clearTimeout(searchTimer);
		searchTimer = setTimeout(runSearchFilter, 150);
	  });
	  $("#header-search-clear").on("click", function(){
		$("#header-search").val("");
		syncSearchClear();
		runSearchFilter();
		$("#header-search").focus();
	  });

	  function scrollToHash(){
		var h = window.location.hash;
		if (!h || h.length < 2) return;
		var id = decodeURIComponent(h.substring(1));
		var el = document.getElementById(id);
		if (el) el.scrollIntoView();
	  }

	  (function applyListQuery(){
		var params = new URLSearchParams(window.location.search);
		var qCountry = params.get("country");
		var qCity = params.get("city");
		var qArea = params.get("area");
		var qAff = params.get("affiliation");
		var changed = false;
		if (qCountry) {
		  $("#filter-country").html(qCountry);
		  $(".toggle-country").removeClass("selected");
		  $(".toggle-country-" + qCountry).addClass("selected");
		  changed = true;
		}
		if (qCity) {
		  $("#filter-city").html(qCity);
		  $(".toggle-city").removeClass("selected");
		  $(".toggle-city-" + qCity).addClass("selected");
		  changed = true;
		}
		if (qArea) {
		  $("#filter-area").html(qArea);
		  $(".toggle-area").removeClass("selected");
		  $(".toggle-area-" + qArea).addClass("selected");
		  changed = true;
		}
		var qField = params.get("field");
		if (qField) {
		  $("#filter-field").html(qField);
		  $(".toggle-field").removeClass("selected");
		  $(".toggle-field-" + qField).addClass("selected");
		  changed = true;
		}
		if (qAff) {
		  $("#filter-affiliation").html(qAff);
		  $(".toggle-affiliation").removeClass("selected");
		  $(".toggle-affiliation-" + qAff).addClass("selected");
		  changed = true;
		}

		var qText = params.get("q");
		if (qText) {
		  $("#header-search").val(qText);
		  syncSearchClear();
		  changed = true;
		}
		if (changed) filter();
		scrollToHash();
	  })();


	  /*
	  $(".toggle-cityxxxx").click(function(){
		if($(this).hasClass("selected")){
			// remove filters
			showAll();
        }else{
			showAll();
			var id = $(this).attr('id');
			city = id.split(":")[4];


			$(".entry").hide();
			$(".city-"+city).fadeIn();
			$(".toggle-city-"+city).addClass("selected");
		}
	  });
	  */
	  window.SV.updateSelectedNumber = updateSelectedNumber;
	  window.SV.runFilter = filter;



	});
	
}
