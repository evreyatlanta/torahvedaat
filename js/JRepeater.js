function JRepeater(config) {
    // private fields
    var _html = '';
    var _jevent = new JEvent(); 
	var _template = new JTemplate(config.template);
    var _columns = (config.columns == null) ? 1 : config.columns;
    var _columnBorderStyle = (config.columnBorderStyle == null) ? "solid 1px black;" : config.columnBorderStyle;
    var _columnAlign = (config.columnAlign == null) ? "center" : config.columnAlign;
	var _separator = (config.separator == null) ? null : config.separator;
	
    // public fields
    this.dataSource = null;  
    
    // public getters 
    this.getHtml = function() { return _html; }
    
    // public events
    this.onDataBind = function(action) { _jevent.addListener(this,"onDataBind",action); };
    this.onDataBindRemove = function(action) { _jevent.removeListener(this, "onDataBind", action); };
    this.onRender = function(action) { _jevent.addListener(this, "onRender", action); };

    this.dataBind = function() {

        // start to evaluate columns
        var html = (_columns <= 1) ? "" : "<table>";

        // validate data source
        if (this.dataSource == null || this.dataSource.length == 0) {
            _html = html;
        }

        for (var i = 0; i < this.dataSource.length; i++) {
            // format data item
            var dataItem;
            if (typeof (this.dataSource[i]) == 'string') {
                dataItem = { "Value": this.dataSource[i], "Index": i };
            } else {
                dataItem = this.dataSource[i];
                dataItem.Index = i;
            }

            // fire event
            var dataArgs = { "dataItem": dataItem, "index": i };
            _jevent.fireEvent(this, 'onDataBind', dataArgs);

            var itemHtml = _template.evaluate(dataArgs.dataItem);

            // item evaluate columns
            if (_columns > 1) {
                var currentColumn = ((i + 1) % _columns);
                if (currentColumn == 1)
                    itemHtml = "<tr><td style='vertical-align:top;border:" + _columnBorderStyle + "' align='" + _columnAlign + "'>" + itemHtml + "</td>";
                else if (currentColumn == 0)
                    itemHtml = "<td style='vertical-align:top;border:" + _columnBorderStyle + "' align='" + _columnAlign + "'>" + itemHtml + "</td></tr>";
                else
                    itemHtml = "<td style='vertical-align:top;border:" + _columnBorderStyle + "' align='" + _columnAlign + "'>" + itemHtml + "</td>";
            } else if (_separator != null && i < this.dataSource.length - 1) {
				itemHtml += _separator;
			}

            html += itemHtml;
        }

        // end to evaluate columns
        if (_columns > 1) {
            var currentColumn = -1;
            var i = this.dataSource.length;

            if (this.dataSource.length > _columns) {
                while (currentColumn != 1) {
                    i += 1;
                    currentColumn = (i % _columns);

                    if (currentColumn == 0)
                        html += "<td></td></tr>";
                    else if (currentColumn > 1)
                        html += "<td></td>";
                }
            } else {
                html += "</tr>";
            }
            html += "</table>";
        }

        // set html
        _html = html;

        _jevent.fireEvent(this, 'onRender', html);
    }
}