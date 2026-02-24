var __hiddenSelects = new Array();
var __stylesheet = null;

function JCore(element) {
	
	var _elem;
	if (typeof(element) == "object")
		_elem = element;
	else if (typeof(element) == "string")
		_elem = document.getElementById(element);
		
	this.me = _elem;
	
	this.isChildOf = function(parentId) {		
		var parent = _elem;
		while (parent != null) {
			if (parent.id == parentId) {
				return true;
			}
			parent = parent.parentNode;
		}
		return false;
	};
	
	this.locate = function() {
		var loc = { x:0, y:0, w:0, h:0 };
		
		if (_elem.style.position != "absolute") {
			var parent = _elem;
			while (parent.offsetParent) {
				parent = parent.offsetParent;
				loc.x += parent.offsetLeft;
				loc.y += parent.offsetTop;
			}
		}
		loc.x += _elem.offsetLeft;
		loc.y += _elem.offsetTop;
		loc.w = _elem.offsetWidth;
		loc.h = _elem.offsetHeight;
		return loc;
	}
	
	this.intersect = function (elem) {
		var loc = this.locate();
		var elLoc = $core(elem).locate();
		return (loc.x + loc.w > elLoc.x && loc.x < elLoc.x + elLoc.w && loc.y + loc.h > elLoc.y && loc.y < elLoc.y + elLoc.h);
	}
	
	this.absolute = function() {
		var loc = this.locate();
		_elem.style.position = "absolute";
		_elem.style.left = (loc.x) + "px";
		_elem.style.top = (loc.y) + "px";
	}
	
	this.undoAbsolute = function() {
		_elem.style.position = "";
		_elem.style.left = "";
		_elem.style.top = "";
	}
	
	this.placeNextTo = function(id, position) {
		var loc = this.locate();
		
		var c2 = new $core(id);
		var loc2 = c2.locate();
		
		_elem.style.position = "absolute";
		
		if (position.indexOf("left") > -1)
			_elem.style.left = (loc2.x - loc.w) + "px";
		else if (position.indexOf("right") > -1)
			_elem.style.left = (loc2.x + loc2.w) + "px";
		else
			_elem.style.left = (loc2.x) + "px";

		if (position.indexOf("top") > -1) 
			_elem.style.top = (loc2.y - loc.h) + "px";
		else if (position.indexOf("bottom") > -1)
			_elem.style.top = (loc2.y + loc2.h) + "px";
		else if (position.indexOf("center") > -1) {
			if (loc2.w > loc.w)
				_elem.style.top = (loc2.y + (loc2.h / 2)) + "px";
			else
				_elem.style.top = (loc2.y - (loc.h / 2)) + "px";
		}
		else
			_elem.style.top = (loc2.y) + "px";
	}

	this.attachEvent = function(eventName, funcName) {
		if (document.all) {
			_elem.attachEvent("on" + eventName, funcName);
		} else {
			_elem.addEventListener(eventName, funcName, false);
		}
	}
	
	this.detachEvent = function(eventName, funcName) {
		if (document.all) {
			_elem.detachEvent("on" + eventName, funcName);
		} else {
			_elem.removeEventListener(eventName, funcName, false);
		}
	}
	
	this.center = function(maxtop) {
		var left = (document.body.clientWidth - _elem.offsetWidth) / 2;
		var top = (document.body.clientHeight - _elem.offsetHeight) / 2;

		_elem.style.left = (left) + "px";
		if (maxtop != null)
		    _elem.style.top = ((top > 200) ? 200 : top) + "px";
		else
		    _elem.style.top = (top) + "px";
	}
	
	this.show = function() {
		_elem.style.display = 'block';
		hideSelects(_elem);
	}
	
	this.hide = function() {
		_elem.style.display = 'none';
		undoHideSelects(_elem);
	}
	
	this.toggle = function() {
		if (_elem.style.display == "none") {
			this.show();
		} else {
			this.hide();
		}
	}
	
	this.clone = function() {
		var temp = _elem.constructor(); // changed    
		for(var key in _elem) 
		{
			temp[key] = $core(obj[key]).clone();    
		}
		return temp;
	}
	
	function undoHideSelects() {
		for (i = 0; i < __hiddenSelects.length; i++) {
			__hiddenSelects[i].style.visibility = "visible";
		}
		__hiddenSelects = new Array(); 
	}
	
	function hideSelects(elem) {
		
		if ($browser.msie && $browser.version < 7) {
			var elLoc = new $core(elem).locate();
			
			var sel = document.getElementsByTagName("SELECT");

			for (var i = 0; i < sel.length; i++) {
				var loc = $core(sel[i]).locate();
				if (loc.x + loc.w > elLoc.x && loc.x < elLoc.x + elLoc.w && loc.y + loc.h > elLoc.y && loc.y < elLoc.y + elLoc.h) {
					var obj = sel[i];
					var shouldHide = true;
					while (true) {
						if (obj.style.visibility == "hidden" || obj.style.display == "none") {
							shouldHide = false;
							break;
						}
						obj = obj.parentNode;
						if (obj == null || obj.style == null)
							break;
					}

					if (shouldHide) {
						sel[i].style.visibility = "hidden";
						__hiddenSelects[__hiddenSelects.length] = sel[i];
					}
				}
			}
		}
	}
	
	return this;
}

function JBrowser() {
	var userAgent = navigator.userAgent.toLowerCase();
	this.version =  parseInt((userAgent.match( /.+(?:rv|it|ra|ie)[\/: ]([\d.]+)/ ) || [])[1]);
	this.safari = /webkit/.test( userAgent );
	this.opera = /opera/.test( userAgent );
	this.msie = /msie/.test( userAgent ) && !/opera/.test( userAgent );
	this.mozilla = /mozilla/.test( userAgent ) && !/(compatible|webkit)/.test( userAgent );
	return this;
}

function JCss(elem) {

	var _elem = elem;

	this.addClass = function(cName) { 
		this.removeClass(cName); 
		return _elem.className += (_elem.className.length > 0 ? ' ' : '' ) + cName; 
	}

	this.removeClass = function(cName) { 
		return _elem.className = _elem.className.replace(new RegExp("^" + cName + "\\b\\s*|\\s*\\b" + cName + "\\b",'g'),''); 
	}
	
	this.hasClass = function(cName) {
		return (!_elem || !_elem.className) ? false : (new RegExp("\\b" + cName + "\\b")).test(_elem.className);
	}
}

function JUtil() {

	this.getEvent = function(e) {
		if (window.event)  { // IE
			e = window.event;
			e.target = e.srcElement;
		}
		else if (e.which) {// Netscape/Firefox/Opera
			
		}
		
		return e;
	}
	
	this.locateMouse = function(e) {
		var loc = { x: -1, y: -1 };
    
		if (e.pageX) 
			loc.x = e.pageX;
		else if (e.clientX)
			loc.x = e.clientX + (document.documentElement.scrollLeft ? document.documentElement.scrollLeft : document.body.scrollLeft);
        
		if (e.pageY) 
			loc.y = e.pageY;
		else if (e.clientY)
			loc.y = e.clientY + (document.documentElement.scrollTop ? document.documentElement.scrollTop : document.body.scrollTop);
			
		return loc;
	}
}

function JRoundCorner(elem, label) {

    var labelHtml = (label == null) ? "" : '<span class="rlabel">' + label + '</span>';

    var tmp = '<div id="' + elem.id + '" class="round">' +
					labelHtml +
					'<b class="r1 ' + elem.className + '"></b>' +
					'<b class="r2 ' + elem.className + '"></b>' +
					'<b class="r3 ' + elem.className + '"></b>' +
					'<b class="r4 ' + elem.className + '"></b>' +
					'<b class="' + elem.className + '"></b>' +
						'<div id="' + elem.id + '_body" class="rbody ' + elem.className + '"></div>' +
					'<b class="' + elem.className + '"></b>' +
					'<b class="r4 ' + elem.className + '"></b>' +
					'<b class="r3 ' + elem.className + '"></b>' +
					'<b class="r2 ' + elem.className + '"></b>' +
					'<b class="r1 ' + elem.className + '"></b>' +
				'</div>';
    var div = document.createElement("DIV");
    div.innerHTML = tmp;

    var ar = div.getElementsByTagName("DIV");

    for (var i = 0; i < ar.length; i++) {
        if ($core(ar[i]).css().hasClass("rbody")) {
            ar[i].innerHTML = elem.innerHTML;
            div.style.cssText = elem.style.cssText;
        }
    }
    elem.parentNode.replaceChild(div, elem);
}

var $browser = JBrowser();
var $util = new JUtil();

JCore.prototype.corner = function(label) {
    new JRoundCorner(this.me, label);
}

JCore.prototype.css = function() {
	return new JCss(this.me);
}
	

function $core(element) {
	return new JCore(element);
}

String.prototype.trim = function() {
    return (this.replace(/^[\s\xA0]+/, "").replace(/[\s\xA0]+$/, ""));
}

String.prototype.startsWith = function(str) {
    return (this.match("^" + str) == str)
}

String.prototype.endsWith = function(str) {
    return (this.match(str + "$") == str) 
}
