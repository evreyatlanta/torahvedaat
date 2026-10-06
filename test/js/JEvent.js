/**
 * Create a new instance of Event.
 *
 * @classDescription	This class creates a new Event.
 * @return {Object}	Returns a new Event object.
 * @constructor
 */
function JEvent()
{
	this.events = [];
}

/**
 * Gets the index of the given action for the element
 *
 * @memberOf Event
 * @param {Object} obj The element attached to the action.
 * @param {String} evt The name of the event.
 * @param {Function} action The action to execute upon the event firing.
 * @return {Number} Returns an integer.
 */
JEvent.prototype.getActionIdx = function(obj,evt,action)
{
	if(obj && evt)
	{
		var curel = this.events[obj][evt];
		if(curel)
		{
			var len = curel.length;
			for(var i = len-1;i >= 0;i--)
			{
				if(curel[i].action == action)
				{
					return i;
				}
			}
		}
		else
		{
			return -1;
		}
	}
	return -1;
};

/**
 * Adds a listener
 *
 * @memberOf Event
 * @param {Object} obj The element attached to the action.
 * @param {String} evt The name of the event.
 * @param {Function} action The action to execute upon the event firing.
 * @return {null} Returns null.
 */
JEvent.prototype.addListener = function(obj,evt,action)
{	
	if(this.events[obj])
	{
		if(this.events[obj][evt])
		{
			if(this.getActionIdx(obj,evt,action,false) == -1)
			{
				var curevt = this.events[obj][evt];
				curevt[curevt.length] = {action:action};
			}
		}
		else
		{
			this.events[obj][evt] = [];
			this.events[obj][evt][0] = {action:action};
		}
	}
	else
	{
		this.events[obj] = [];
		this.events[obj][evt] = [];
		this.events[obj][evt][0] = {action:action};
	}
};

/**
 * Removes a listener
 *
 * @memberOf Event
 * @param {Object} obj The element attached to the action.
 * @param {String} evt The name of the event.
 * @param {Function} action The action to execute upon the event firing.
 * @return {null} Returns null.
 */
JEvent.prototype.removeListener = function(obj,evt,action)
{
	if(this.events[obj])
	{
		if(this.events[obj][evt])
		{
			var idx = this.getActionIdx(obj,evt,action);
			if(idx >= 0)
			{
				this.events[obj][evt].splice(idx,1);
			}
		}
	}
};

/**
 * Fires an event
 *
 * @param {Object} obj The element attached to the action.
 * @param {String} evt The name of the event.
 * @param {Object} args The argument attached to the event.
 * @return {null} Returns null.
 */
JEvent.prototype.fireEvent = function(obj,evt,args)
{
	if(obj && this.events)
	{
		var evtel = this.events[obj];
		if(evtel)
		{
			var curel = evtel[evt];
			if(curel)
			{
				for(var i = 0; i < curel.length; i++)
				{
					var action = curel[i].action;
					return action(args);
				}
			}
		}
	}
	
	return true;
};