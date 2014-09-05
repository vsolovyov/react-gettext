var Jed = require( 'jed' ),
	React = require( 'react' ),
	localeData, i18n;

module.exports.initialize = function( _localeData ) {
	localeData = _localeData;
};

/**
 * To be used as a React mixin in translation Components to enable asynchronous loading of locale
 * data and initialization of Jed instance.
 */
var TranslatableMixin = {
	pendingFetch: [],

	componentDidMount: function() {
		if ( typeof i18n !== 'undefined' ) {
			this.setState({ i18n: i18n });
		} else {
			var initializeJed = function( localeData ) {
				i18n = new Jed({
					locale_data: {
						messages: localeData
					}
				});
				this.setState({ i18n: i18n });
			}.bind( this );

			if ( typeof localeData === 'string' ) {
				this.retrieveOnce( localeData, initializeJed );
			} else if ( localeData && typeof localeData === 'object' ) {
				initializeJed( localeData );
			} else {
				initializeJed( {} );
			}
		}
	},

	retrieveOnce: function( url, callback ) {
		this.pendingFetch.push( callback );

		if ( this.pendingFetch.length === 1 ) {
			xhrGet(
				url,
				function( localeData ) {
					var localeDataJson = JSON.parse( localeData );

					while ( this.pendingFetch.length > 0 ) {
						var cb = this.pendingFetch.shift();
						cb( localeDataJson );
					}
				}.bind( this )
			);
		}
	},

	getStringArguments: function() {
		if ( typeof this.props.args !== 'undefined' ) {
			return this.props.args.split( /[^\\],/g ).map(function(arg) {
				return arg.replace( '\\,', ',' );
			});
		}

		return this.props;
	},

	isI18nReady: function() {
		return this.state && typeof this.state.i18n !== 'undefined';
	}
};

/**
 * A react component that returns a string translated in the current locale.
 * Arguments are expected to be passed either with the `args` property as a comma-delimited string
 * or as an object where each ke matches an sprintf named parameter. In the case of comma-delimited
 * string parameter, you can escape intentional commas with a blackslash (i.e. `\,`)
 *
 * Example:
 *
 *   React.renderComponent(
 *     <__ args="WordPress.com\, Dawg">Sign in to %s</__>,
 *     document.body
 *   );
 *
 * @see http://codex.wordpress.org/Function_Reference/_2
 */
module.exports.__ = React.createClass({
	displayName: '__',
	mixins: [ TranslatableMixin ],

	render: function() {
		var str;

		if ( this.isI18nReady() ) {
			str = Jed.sprintf( this.state.i18n.gettext(
				this.props.children
			), this.getStringArguments() );
		} else {
            str = this.props.children;
        }

		return React.DOM.text( null, str );
	}
});

/**
 * A react component that returns a string translated in the current locale with gettext context.
 * Arguments are expected to be passed either with the `args` property as a comma-delimited string
 * or as an object where each ke matches an sprintf named parameter. In the case of comma-delimited
 * string parameter, you can escape intentional commas with a blackslash (i.e. `\,`). Context is to
 * be provided using the `context` parameter.
 *
 * Example:
 *
 *   React.renderComponent(
 *     <_x context="theme">Already Installed</_x>,
 *     document.body
 *   );
 *
 * @see http://codex.wordpress.org/Function_Reference/_x
 */
module.exports._x = React.createClass({
	displayName: '_x',
	mixins: [ TranslatableMixin ],

	render: function() {
		var str;

		if ( this.isI18nReady() ) {
			str = Jed.sprintf( this.state.i18n.pgettext(
				this.props.context,
				this.props.children
			), this.getStringArguments() );
		}

		return React.DOM.text( null, str );
	}
});

/**
 * A react component that returns a string in plural or single form based on the specified `count`.
 * The `_n` component requires three properties be specified: `single`, `plural` and `count`, where
 * `single` is the single form (where `count` is 1) and `plural` is the plural form (where `count`
 * is not 1).
 *
 * Example:
 *
 *   React.renderComponent(
 *     <_n single="%s comment approved" plural="%s comments approved" count="2" />,
 *     document.body
 *   );
 *
 * @see http://codex.wordpress.org/Function_Reference/_n
 */
module.exports._n = React.createClass({
	displayName: '_n',
	mixins: [ TranslatableMixin ],

	render: function() {
		var str;

		if ( this.isI18nReady() ) {
			str = Jed.sprintf( this.state.i18n.npgettext(
				undefined,
				this.props.single,
				this.props.plural,
				this.props.count
			), this.props.count );
		}

		return React.DOM.text( null, str );
	}
});

/**
 * Dispatches an XMLHttpRequest GET request with specified URL and callback
 */
function xhrGet( url, callback ) {
	var request = new XMLHttpRequest();
	request.open( 'GET', url, true );

	request.onload = function() {
		if ( request.status >= 200 && request.status < 400 ) {
			callback( request.responseText );
		} else {
			callback( null );
		}
	};

	request.onerror = function() {
		callback( null );
	};

	request.send();
}
