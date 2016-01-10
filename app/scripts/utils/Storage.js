/**
 * @module Storage
 * @desc Deals with LocalStorage
 */

export default {
	/**
	 * @param {string} name
	 *
	 * @returns {Object}
	 */
	getItem(name) {
		return JSON.parse(localStorage.getItem(name));
	},

	/**
	 * @param {string} name
	 * @param {Object} value
	 */
	setItem(name, value) {
		localStorage.setItem(name, JSON.stringify(value));
	},

	/**
	 * Remove item from localStorage.
	 *
	 * @param {string} name
	 */
	removeItem(name) {
		localStorage.removeItem(name);
	},

	/**
	 * Clear localStorage.
	 */
	clearAll() {
		localStorage.clear();
	}
};
