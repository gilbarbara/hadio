import React from 'react';
import ReactDOM from 'react-dom';
import classNames from 'classnames';
import moment from 'moment';
import fetchJsonp from 'fetch-jsonp';
import { autobind } from 'core-decorators';

import $ from 'jquery';
import 'jPlayer/dist/jplayer/jquery.jplayer.js';

import Loader from './elements/Loader';

class Player extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			playerReady: false,
			ready: false,
			station: undefined,
			tracks: undefined
		};

		this.$player = undefined;
		this.retryCount = 0;
		this.timeouts = {};
		this.intervals = {};
		this.debug = true;

		window.Player = this;
	}

	static contextTypes = {
		app: React.PropTypes.object
	};
	
	static propTypes = {
		apiUrl: React.PropTypes.string.isRequired
	};

	componentDidMount() {
		this.app = this.context.app;

		this.fetchData(this.props.apiUrl + 'station-metadata?callback=callback')
			.then(station => {
				const data = station.data;

				this.setState({
					name: data.name,
					logo: data.logo,
					description: data.description,
					streams: data.stream_data
				}, this.selectStream);
			});
	}

	updateData(now) {
		const STATE = this.state;
		const ends      = moment(STATE.tracks.current.ends);
		const date      = moment();
		const nextFetch = ends - date > 0 ? ends - date : (moment(STATE.tracks.next.ends) - date);

		if (now) {
			this.fetchData()
				.then(result => {
					const data = result.data;

					if (data.tracks.current.type === 'livestream') {
						this.setState({
							current: data.tracks.current,
							station: data.station,
							tracks: data.tracks,
							shows: data.shows
						});
					}
					else {
						if (this.intervals.livestream) {
							clearInterval(this.intervals.livestream);
						}

						if (data.tracks && data.tracks.current.name !== STATE.tracks.current.name) {
							this.intervals.notPlaying = setInterval(() => {
								this.app.log('updateData:interval', moment(data.tracks.current.starts) < moment());
								if (moment(data.tracks.current.starts) < moment()) {
									this.app.log('updateData:setState', data.tracks);
									this.setState({
										current: data.tracks.current,
										station: data.station,
										tracks: data.tracks,
										shows: data.shows
									}, () => {
										this.retryCount = 0;
										this.updateData();
									});
									clearInterval(this.intervals.notPlaying);
								}
							}, 1000);
						}
						else if (ends - date < 3000 && this.retryCount < 8) {
							this.app.log('updateData:retry', this.retryCount);
							setTimeout(() => {
								if (moment(STATE.tracks.next.starts) < date) {
									this.setState({
										current: STATE.tracks.next
									});
								}
								this.updateData(this.retryCount < 7);
								this.retryCount++;
							}, 1000 * this.retryCount + 1);
						}
						else {
							this.updateData();
						}
					}
				});
		}
		else if (STATE.current.type === 'track') {
			this.app.log('updateData:nextFetch', nextFetch, this.secondsToTime(nextFetch / 1000), ends.format('HH:mm:ss'));

			clearTimeout(this.timeouts.nextFetch);
			this.timeouts.nextFetch = setTimeout(() => {
				this.app.log('***updateData:setTimeoutcallback', new Date());
				this.updateData(true);
			}, nextFetch);
		}
		else {
			this.app.log('updateData:livestream', STATE.current);

			clearInterval(this.intervals.livestream);
			this.intervals.livestream = setInterval(() => {
				this.updateData(true);
			}, 15000);
		}
	}

	fetchData(url) {
		return fetchJsonp(url || this.props.apiUrl + 'live-info-v2?callback=callback')
			.then(response => {
				if (response.status >= 400 && response.status !== 404) {
					const error = new Error(response.statusText);
					error.response = response;
					throw error;
				}
				else {
					return response;
				}
			})
			.then(response => {
				return response.json().then((data) => {
					return { status: response.status, headers: response.headers, data };
				});
			})
			.then((data) => {
				return data;
			})
			.catch((error) => {
				console.log('request failed', error); // eslint-disable-line no-console
			});
	}

	selectStream() {
		const state = this.state;
		let stream;

		if (!state.streams) {
			this.setState({
				error: 'No streams'
			});

			return false;
		}

		this.app.setStationData({
			logo: this.state.logo,
			name: this.state.name,
			description: this.state.description
		});

		Object.keys(state.streams).forEach(d => {
			if (!stream || stream.bitrate > state.streams[d].bitrate) {
				stream = state.streams[d].url;
			}
		});

		this.fetchData().then(result => {
			const live = result.data;

			this.setState({
				stream,
				ready: true,
				current: live.tracks.current,
				station: live.station,
				tracks: live.tracks,
				shows: live.shows
			}, () => {
				this.initPlayer();
				this.updateData();
			});
		});
	}

	initPlayer() {
		this.$player = $(ReactDOM.findDOMNode(this.refs.player));

		this.$player.jPlayer({
			swfPath: '../dist/jplayer',
			solution: 'html, flash',
			supplied: 'mp3',
			preload: 'none',
			volume: 1.0,
			muted: false,
			backgroundColor: '#000000',
			cssSelectorAncestor: '#jp_container_1',
			cssSelector: {
				videoPlay: '.jp-video-play',
				play: '.jp-play',
				pause: '.jp-pause',
				stop: '.jp-stop',
				seekBar: '.jp-seek-bar',
				playBar: '.jp-play-bar',
				mute: '.jp-mute',
				unmute: '.jp-unmute',
				volumeBar: '.jp-volume-bar',
				volumeBarValue: '.jp-volume-bar-value',
				volumeMax: '.jp-volume-max',
				playbackRateBar: '.jp-playback-rate-bar',
				playbackRateBarValue: '.jp-playback-rate-bar-value',
				currentTime: '.jp-current-time',
				duration: '.jp-duration',
				title: '.jp-title',
				fullScreen: '.jp-full-screen',
				restoreScreen: '.jp-restore-screen',
				repeat: '.jp-repeat',
				repeatOff: '.jp-repeat-off',
				gui: '.jp-gui',
				noSolution: '.jp-no-solution'
			},
			errorAlerts: true,
			warningAlerts: false,
			ready: () => {
				this.setState({
					playerReady: true
				});
				this.$player.jPlayer('setMedia', { mp3: this.state.stream }).jPlayer('play'); // Attempt to auto play the media
			},
			pause: () => {
				this.$player.jPlayer('clearMedia');
			},
			error: (event) => {
				if (this.state.playerReady && event.jPlayer.error.type === $.jPlayer.error.URL_NOT_SET) {
					// Setup the media stream again and play it.
					this.$player.jPlayer('setMedia', { mp3: this.state.stream }).jPlayer('play');
				}
			}
		});
	}

	@autobind
	onClickLogout(e) {
		e.preventDefault();

		this.app.setApiUrl('');
	}

	secondsToTime(secs) {
		const secNum = parseInt(secs, 10);
		let hours = Math.floor(secNum / 3600);
		let minutes = Math.floor((secNum - (hours * 3600)) / 60);
		let seconds = secNum - (hours * 3600) - (minutes * 60);

		if (hours && hours < 10) {
			hours = '0' + hours;
		}

		if (minutes < 10) {
			minutes = '0' + minutes;
		}

		if (seconds < 10) {
			seconds = '0' + seconds;
		}

		return (hours ? hours + ':' : '') + minutes + ':' + seconds;
	}

	decodeHtml(html) {
		const txt = document.createElement('textarea');
		txt.innerHTML = html;
		return txt.value;
	}

	render() {
		const STATE = this.state;
		const info = {};

		let html;
		let show;

		if (STATE.ready) {
			info.name = STATE.current.name;
			info.next = STATE.current.name !== STATE.tracks.next.name ? STATE.tracks.next.name : '--';
			info.starts = moment(STATE.current.starts);
			info.ends = moment(STATE.current.ends);
			info.duration = this.secondsToTime((info.ends - info.starts) / 1000);

			show = (
				<div className="radio-player__show">
					<div className="radio-player__listening">you're listening to:</div>
					<h3 className="radio-player__title">{STATE.shows.current.name}</h3>
					{STATE.shows.current.description ?
					 <div className="radio-player__description">{STATE.shows.current.description}</div> : ''}
					<div
						className="radio-player__time">{moment(STATE.shows.current.starts).format('DD.MM HH:mm')} – {moment(STATE.shows.current.ends).format('DD.MM HH:mm')}</div>
				</div>
			);

			html = (
				<div className="radio-player">
					<div ref="player" id="jquery_jplayer_1" className="jp-jplayer"></div>
					<div id="jp_container_1"
						 className={classNames('radio-player--main jp-audio-stream', { live: STATE.current.type === 'livestream' })}
						 role="application"
						 aria-label="media player">
						<div className="jp-type-single">
							<div className="jp-gui jp-interface">
								<div className="jp-controls-wrapper clearfix">
									<div className="jp-controls">
										<button className="jp-play btn btn-primary" role="button" tabIndex="0">
											<i className="i-play" />
										</button>
										<button className="jp-pause btn btn-primary" role="button" tabIndex="0">
											<i className="i-pause" />
										</button>
									</div>
									<div className="jp-details">
										<div className="jp-title" aria-label="title">{this.decodeHtml(info.name)}</div>
									</div>
								</div>
								<div className="jp-volume-controls clearfix">
									<a href="#" className="jp-mute" role="button" tabIndex="0">
										<i className="i-volume-off" />
									</a>
									<a href="#" className="jp-volume-max" role="button" tabIndex="2">
										<i className="i-volume-up" />
									</a>
									<div className="jp-volume-bar">
										<div className="jp-volume-bar-value"></div>
									</div>
								</div>

								<div className="jp-next">Next: {this.decodeHtml(info.next)}</div>
							</div>
							<div className="jp-no-solution">
								<span>Update Required</span>
								To play the media you will need to either update your browser to a recent version or update your
								<a href="http://get.adobe.com/flashplayer/" target="_blank">Flash plugin</a>.
							</div>
						</div>
						{STATE.current.type === 'livestream' ? <div className="jp-live">LIVE</div> : ''}
					</div>
					{show}
					<a href="#" className="app__logout" onClick={this.onClickLogout}>Change Radio</a>
				</div>
			);
		}
		else {
			html = (<Loader />);
		}

		return (
			<div key="Player" className="app__player">
				{html}
			</div>
		);
	}
}

export default Player;
