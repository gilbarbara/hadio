/*eslint-disable */

/**
 * Helper methods for Objects
 * @module Object
 */

export const isObject = (value) => {
	return Boolean(value) && typeof value === 'object' && value.length === undefined;
};

export const diff = (a, b) => {
	const r = {};

	Object.keys(a).forEach(k => {
		const v = a[k];

		if (b[k] === v) {
			return;
		}

		r[k] = isObject(v) ? diff(v, b[k]) : v;
	});

	return r;
};

export const equal = (a, b) => {
	return Object.keys(diff(a, b)).length > 0;
};

/**
 * Convert object to querystring
 * @method
 * @param {Object} data
 * @returns {String}
 */
export const param = (data) => {
	function stringify(obj, topLevel, keyProp) {
		let string = '';
		for (const key in obj) {
			if (obj.hasOwnProperty(key)) {
				if (keyProp && topLevel[keyProp] && topLevel[keyProp].indexOf(obj[key]) !== 0) {
					string += keyProp;
				}
				if (topLevel[key]) {
					string += key;
				}
				else {
					string += '[' + key + ']';
				}
				
				if (obj[key] instanceof Array) {
					string += stringify(obj[key], topLevel, key);
				}
				else if (obj[key] instanceof Object) {
					string += stringify(obj[key], topLevel);
				}
				else {
					string += '=' + obj[key];
					string += '&';
				}
			}
		}
		return string;
	}

	let string = stringify(data, data);

	return encodeURI(string.substring(0, string.length - 1).split(' ').join('+'));
};

/**
 * Convert querystring to object
 * @method
 * @param {String} params
 * @param {Boolean} [coerce]
 * @returns {Object}
 */
export let deparam = (params, coerce) => {
	const obj = {};
	const coerceTypes = { true: !0, false: !1, null: null };

	if (typeof params !== 'string') {
		return obj;
	}
	if (typeof coerce === 'undefined') {
		coerce = false;
	}

	function safeDecodeURIComponent(component) {
		let returnvalue = '';
		try {
			returnvalue = decodeURIComponent(component);
		}
		catch (e) {
			returnvalue = unescape(component);
		}
		return returnvalue;
	}

	// Iterate over all name=value pairs.
	params.replace(/\+/g, ' ').split('&').forEach((element) => {
		let parm     = element.split('='),
			key      = safeDecodeURIComponent(parm[0]),
			cur      = obj,
			i        = 0,
			val,
			keys     = key.split(']['), // If key is more complex than 'foo', like 'a[]' or 'a[b][c]', split it into its component parts.
			keysLast = keys.length - 1;
		
		// If the first keys part contains [ and the last ends with ], then []
		// are correctly balanced.
		if (/\[/.test(keys[0]) && /\]$/.test(keys[keysLast])) {
			// Remove the trailing ] from the last keys part.
			keys[keysLast] = keys[keysLast].replace(/\]$/, '');
			
			// Split first keys part into two parts on the [ and add them back onto
			// the beginning of the keys array.
			keys = keys.shift().split('[').concat(keys);
			
			keysLast = keys.length - 1;
		}
		else {
			// Basic 'foo' style key.
			keysLast = 0;
		}
		
		// Are we dealing with a name=value pair, or just a name?
		if (parm.length === 2) {
			val = safeDecodeURIComponent(parm[1]);
			
			// Coerce values.
			if (coerce) {
				val = val && !isNaN(val) ? +val              // number
					: val === 'undefined' ? undefined         // undefined
						  : coerceTypes[val] !== undefined ? coerceTypes[val] // true, false, null
						  : val;                                                // string
			}
			
			if (keysLast) {
				// Complex key, build deep object structure based on a few rules:
				// * The 'cur' pointer starts at the object top-level.
				// * [] = array push (n is set to array length), [n] = array if n is
				//   numeric, otherwise object.
				// * If at the last keys part, set the value.
				// * For each keys part, if the current level is undefined create an
				//   object or array based on the type of the next keys part.
				// * Move the 'cur' pointer to the next level.
				// * Rinse & repeat.
				for (; i <= keysLast; i++) {
					key = keys[i] === '' ? cur.length : keys[i];
					cur = cur[key] = i < keysLast
						? cur[key] || ( keys[i + 1] && isNaN(keys[i + 1]) ? {} : [] )
						: val;
				}
			}
			else if (Array.isArray(obj[key])) {
				// val is already an array, so push on the next value.
				obj[key].push(val);
			}
			else if (obj[key] !== undefined) {
				// val isn't an array, but since a second value has been specified,
				// convert val into an array.
				obj[key] = [obj[key], val];
			}
			else {
				// val is a scalar.
				obj[key] = val;
			}
		}
		else if (key) {
			// No value was defined, so set something meaningful.
			obj[key] = coerce
				? undefined
				: '';
		}
	});

	return obj;
};

export default { param, deparam, diff, equal, isObject };
