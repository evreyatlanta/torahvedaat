function JDialog(context) {
    var _id = context.id;
    var _content = context.content;
    var _loaded = false;
    var _width = context.width;
    var _height = context.height;

    var html = '<div style="display:none;background-color:gray;filter: alpha(opacity=50);opacity: 0.5;z-index:998;z-index:998;position:absolute;top:0px;left:0px;width:100%;height:100%;" id="' + _id + '"></div>' +
		   '<div style="display:none;background-color:white;position:absolute;z-index:99999;width:' + _width + ';height:' + _height + ';border:solid 1px black;vertical-align:middle" id="' + _id + 'win">' +
				_content +
		   '</div>';

    this.load = function() {
        document.body.innerHTML += html;
        _loaded = true;
    }

    this.unload = function() {
        document.body.removeChild($core(_id).me);
        document.body.removeChild($core(_id + 'win').me);
        _loaded = false;
    }

    this.show = function() {
        if (!_loaded)
            this.load();
        $core(_id).show();
        $core(_id).me.style.height = document.body.scrollHeight + "px";
        document.body.style.overflow = "hidden";

        $core(_id + 'win').show();
        $core(_id + 'win').center(200);
    }

    this.hide = function() {
        $core(_id).hide();
        $core(_id + 'win').hide();
        document.body.style.overflow = "";
    }
}