import React from 'react';
import shouldPureComponentUpdate from 'react-pure-render/function';

class Loader extends React.Component {
	constructor (props) {
		super(props);
	}

	static propTypes = {
		inline: React.PropTypes.bool,
		inside: React.PropTypes.bool
	}

	static defaultProps = {
		inside: false
	}

	shouldComponentUpdate = shouldPureComponentUpdate;

	render () {
		let html = (
			<div className="loader">
				<svg className="loader__svg">
					<circle className="loader__circle"
							cx="50"
							cy="50"
							r="20"
							fill="none"
							strokeWidth="2" />
				</svg>
			</div>
		);

		if (this.props.inside) {
			html = (
				<ul className="loader-inside">
					<li />
					<li />
					<li />
				</ul>
			);
		}

		if (this.props.inline) {
			html = (<div className="loader-inline"><span /><span /><span /></div>);
		}

		return html;
	}
}

export default Loader;
