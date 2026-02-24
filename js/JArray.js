if (!Array.prototype.every) {
	Array.prototype.every = function(fun) {
		var len = this.length;
		if (typeof fun != "function")
			throw new TypeError();

		var thisp = arguments[1];
		for (var i = 0; i < len; i++) {
			if (i in this && !fun.call(thisp, this[i], i, this))
				return false;
		}
		return true;
	};
}

if (!Array.prototype.filter) {
	Array.prototype.filter = function(fun) {
		var len = this.length;
		if (typeof fun != "function")
			throw new TypeError();

		var res = new Array();
		var thisp = arguments[1];
		for (var i = 0; i < len; i++) {
			if (i in this) {
				var val = this[i]; // in case fun mutates this
				if (fun.call(thisp, val, i, this))
					res.push(val);
			}
		}
		return res;
	};
}

Array.prototype.find = function(searchStr) {
	var returnArray = false;
	for (i=0; i<this.length; i++) {
		if (typeof(searchStr) == 'function') {
			if (searchStr.test(this[i])) {
				if (!returnArray) { returnArray = [] }
				returnArray.push(i);
			}
		} else {
			if (this[i]===searchStr) {
				if (!returnArray) { returnArray = [] }
				returnArray.push(i);
			}
		}
	}
	return returnArray;
}

Array.prototype.contains = function(searchStr) {
    for (i = 0; i < this.length; i++) {
        if (typeof (searchStr) == 'function') {
            if (searchStr.test(this[i])) {
                return true;
            }
        } else {
            if (this[i] === searchStr) {
                return true;
            }
        }
    }
    return false;
};

Array.prototype.findFirst = function(fun) {
    var len = this.length;
    if (typeof fun != "function")
        throw new TypeError();

    var thisp = arguments[1];
    for (var i = 0; i < len; i++) {
        if (i in this) {
            var val = this[i]; // in case fun mutates this
            if (fun.call(thisp, val, i, this))
                return val;
        }
    }

    return null;
};

Array.prototype.top = function(num) {
    var arr = new Array()

    num = (num > this.length) ? this.length : num;

    for (var i = 0; i < num; i++) {
        arr[i] = this[i];
    }
    return arr;
};

Array.prototype.skip = function(num) {
    var arr = new Array()
    for (var i = num; i < this.length; i++) {
        arr[i - num] = this[i];
    }
    return arr;
};

Array.prototype.range = function(from, to) {
    var from = (this.length > from) ? from : this.length;
    var to = (this.length > to) ? to : this.length;

    var arr = new Array();
    for (var i = from; i < to; i++) {
        arr[i - from] = this[i];
    }
    return arr;
};