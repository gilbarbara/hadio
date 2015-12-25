import React from 'react';
import ReactDOM from 'react-dom';
import fetchJsonp from 'fetch-jsonp';
import moment from 'moment';
import classNames from 'classnames';
import config from './config';
import Loader from './components/Loader';

import $ from 'jquery';
import 'jPlayer/dist/jplayer/jquery.jplayer.js';

class Hadio extends React.Component {
	constructor (props) {
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

		window.Hadio = this;
	}

	componentDidMount () {
		this.fetchData(config.apiUrl + 'station-metadata?callback=callback')
			.then(station => {
				this.setState({
					name: station.name,
					logo: station.logo,
					description: station.description,
					streams: station.stream_data
				}, () => {
					this.fetchData().then(data => {
						this.setState({
							ready: true,
							current: data.tracks.current,
							station: data.station,
							tracks: data.tracks,
							shows: data.shows
						}, () => {
							this.initPlayer();
							this.updateData();
						});
					});
				});
			});
	}

	updateData (now) {
		const STATE = this.state;
		let ends      = moment(STATE.tracks.current.ends),
			date      = moment(),
			nextFetch = ends - date > 0 ? ends - date : (moment(STATE.tracks.next.ends) - date);

		if (now) {
			this.fetchData()
				.then(data => {
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
								this.log('updateData:interval', moment(data.tracks.current.starts) < moment());
								if (moment(data.tracks.current.starts) < moment()) {
									this.log('updateData:setState', data.tracks);
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
							this.log('updateData:retry', this.retryCount);
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
			this.log('updateData:nextFetch', nextFetch, this.secondsToTime(nextFetch / 1000), ends.format('HH:mm:ss'));

			clearTimeout(this.timeouts.nextFetch);
			this.timeouts.nextFetch = setTimeout(() => {
				this.log('***updateData:setTimeoutcallback', new Date());
				this.updateData(true);
			}, nextFetch);
		}
		else {
			this.log('updateData:livestream', STATE.current);

			clearInterval(this.intervals.livestream);
			this.intervals.livestream = setInterval(() => {
				this.updateData(true);
			}, 15000);
		}
	}

	fetchData (url) {
		url = url || config.apiUrl + 'live-info-v2?callback=callback';

		return fetchJsonp(url)
			.then(response => {
				return response.json();
			})
			.then(json => {
				this.log('fetchData', json);
				return json;
			})
			.catch(e => {
				throw e;
			});
	}

	initPlayer () {
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
				this.$player.jPlayer('setMedia', { mp3: config.stream }).jPlayer('play'); // Attempt to auto play the media
			},
			pause: () => {
				this.$player.jPlayer('clearMedia');
			},
			error: (event) => {
				if (this.state.playerReady && event.jPlayer.error.type === $.jPlayer.error.URL_NOT_SET) {
					// Setup the media stream again and play it.
					this.$player.jPlayer('setMedia', { mp3: config.stream }).jPlayer('play');
				}
			}
		});
	}

	secondsToTime (secs) {
		var sec_num = parseInt(secs, 10),
			hours   = Math.floor(sec_num / 3600),
			minutes = Math.floor((sec_num - (hours * 3600)) / 60),
			seconds = sec_num - (hours * 3600) - (minutes * 60);

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

	decodeHtml (html) {
		var txt = document.createElement('textarea');
		txt.innerHTML = html;
		return txt.value;
	}

	log (msg) {
		if (this.debug) {
			console.log(...arguments); //eslint-disable-line no-console
		}
	}

	render () {
		const STATE = this.state;
		let html,
			header,
			show,
			info = {};

		if (STATE.ready) {
			info.name = STATE.current.name;
			info.next = STATE.current.name !== STATE.tracks.next.name ? STATE.tracks.next.name : '--';
			info.starts = moment(STATE.current.starts);
			info.ends = moment(STATE.current.ends);
			info.duration = this.secondsToTime((info.ends - info.starts) / 1000);

			header = (
				<header className="app__header clearfix">
					{STATE.logo ? <img src={STATE.logo} alt={STATE.name} /> : ''}
					<h1>{STATE.name}</h1>
					<h3>{STATE.description}</h3>
				</header>
			);

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
					{show}
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
				</div>
			);
		}
		else {
			html = (<Loader />);
		}

		return (
			<div key="Hadio" className={classNames('app', { app__loading: !STATE.ready })}>
				{header}

				<main className="app__content">
					{html}
				</main>
				<footer className="app__footer">
					Hadio {String(new Date().getFullYear()).replace('20', '2k')}
				</footer>
			</div>
		);
	}
}

export default Hadio;
