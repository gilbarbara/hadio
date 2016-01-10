/*eslint-disable no-var, func-names, indent, prefer-arrow-callback, object-shorthand,  require-jsdoc  */
var gulp        = require('gulp'),
	$           = require('gulp-load-plugins')(),
	browserify  = require('browserify'),
	buffer      = require('vinyl-buffer'),
	browserSync = require('browser-sync'),
	del         = require('del'),
	exec        = require('child_process').exec,
	merge       = require('merge-stream'),
	path        = require('path'),
	runSequence = require('run-sequence'),
	source      = require('vinyl-source-stream'),
	vinylPaths  = require('vinyl-paths'),
	watchify    = require('watchify');

var isProduction = function () {
		return process.env.NODE_ENV === 'production';
	},
	commitMessage;

function watchifyTask(options) {
	var bundler, rebundle, iteration = 0;
	bundler = browserify({
		entries: path.join(__dirname, '/app/scripts/main.js'),
		basedir: __dirname,
		insertGlobals: options.watch,
		cache: {},
		// debug: options.watch,
		packageCache: {},
		fullPaths: options.watch,
		extensions: ['.jsx']
	});

	if (options.watch) {
		bundler = watchify(bundler);
	}

	rebundle = function () {
		var stream = bundler.bundle();

		if (options.watch) {
			stream.on('error', function (err) {
				console.log(err); // eslint-disable-line no-console
			});
		}

		stream
			.pipe(source('bundle.js'))
			.pipe(buffer())
			.pipe(gulp.dest('.tmp/scripts'))
			.pipe($.tap(function () {
				if (iteration === 0 && options.cb) {
					options.cb();
				}
				console.log(iteration); // eslint-disable-line no-console
				iteration++;
			}));
	};

	bundler.on('update', rebundle);
	return rebundle();
}

// Scripts
gulp.task('scripts', function (cb) {
	return watchifyTask({
		watch: !isProduction(),
		cb: cb
	});
});

gulp.task('scripts:lint', function () {
	return gulp.src('app/scripts/**/*')
		.pipe($.eslint({
			plugins: ['react', 'jsdoc']
		}))
		.pipe($.eslint.format())
		.pipe($.eslint.failOnError());
});

gulp.task('styles', function () {
	return gulp.src('app/styles/main.scss')
		.pipe($.changed('styles', {
			extension: '.scss'
		}))
		.pipe($.sourcemaps.init())
		.pipe($.plumber())
		.pipe($.sass.sync({
			includePaths: ['bower_components'],
			precision: 4
		}).on('error', $.sass.logError))
		.pipe($.plumber.stop())
		.pipe($.autoprefixer({
			browsers: ['last 2 versions']
		}))
		.pipe($.sourcemaps.write('.'))
		.pipe(gulp.dest('.tmp/styles'))
		.pipe($.size({
			title: 'Styles'
		}));
});

gulp.task('media', function () {
	return gulp.src(['app/media/**/*.{jpg,gif,png}'])
		.pipe($.cache($.imagemin({
			verbose: true,
			progressive: true,
			interlaced: true
		})))
		.pipe(gulp.dest('dist/media'))
		.pipe($.size({
			title: 'Media'
		}));
});

gulp.task('bundle', function () {
	var html,
		fonts,
		extras,
		svg;

	html = gulp.src('app/*.html')
		.pipe($.useref())
		.pipe($.if('*.js', $.uglify()))
		.pipe($.if('*.css', $.cssmin()))
		.pipe(gulp.dest('dist'))
		.pipe($.size({
			title: 'HTML'
		}));

	fonts = gulp.src('app/fonts/**/*')
		.pipe(gulp.dest('dist/fonts'))
		.pipe($.size({
			title: 'Fonts'
		}));

	extras = gulp.src([
			'app/*.*',
			'!app/*.html',
			'node_modules/apache-server-configs/dist/.htaccess'
		], {
			dot: true
		})
		.pipe(gulp.dest('dist'))
		.pipe($.size({
			title: 'Extras'
		}));

	svg = gulp.src([
			'app/media/**/*.svg'
		])
		.pipe(gulp.dest('dist/media'))
		.pipe($.size({
			title: 'SVG'
		}));

	return merge(html, fonts, extras, svg);
});

gulp.task('sizer', function () {
	return gulp.src('dist/**/*')
		.pipe($.size({
			title: 'Build',
			gzip: true
		}));
});

gulp.task('modernizr', function (cb) {
	return exec('./node_modules/.bin/modernizr -c .modernizr-config.json -d .tmp/scripts/modernizr.js', cb);
});

gulp.task('assets', ['clean'], function (cb) {
	runSequence('styles', 'scripts', 'modernizr', cb);
});

gulp.task('clean', function (cb) {
	var target = ['.tmp/*'];
	if (isProduction()) {
		target.push('dist/*');
	}

	return del(target, cb);
});

gulp.task('serve', ['assets'], function () {
	browserSync({
		notify: true,
		logPrefix: 'hadio',
		files: ['app/*.html', '.tmp/styles/**/*.css', '.tmp/*.js', 'app/media/**/*'],
		server: {
			baseDir: ['.tmp', 'app'],
			routes: {
				'/bower_components': 'bower_components',
				'/node_modules': 'node_modules'
			}
		}
	});
	gulp.watch('app/styles/**/*.scss', function (e) {
		if (e.type === 'changed') {
			gulp.start('styles');
		}
	});
	gulp.watch('.tmp/scripts/**/*.js', browserSync.reload);
	gulp.watch('.tmp/styles/**/*.css', browserSync.stream);
	gulp.watch('.modernizr-config.json', ['modernizr', browserSync.reload]);
});

gulp.task('build', function (cb) {
	process.env.NODE_ENV = 'production';
	runSequence('scripts:lint', 'assets', ['media', 'bundle'], 'sizer', cb);
});

gulp.task('get-commit', function (cb) {
	exec('git log -1 --pretty=%s && git log -1 --pretty=%b', function (err, stdout) {
		var parts = stdout.replace('\n\n', '').split('\n');

		commitMessage = parts[0];
		if (parts[1]) {
			commitMessage += ' — ' + parts[1];
		}

		cb(err);
	});
});

gulp.task('gh-pages', function () {
	var clean,
		push;

	clean = gulp.src('.publish/.DS_Store')
		.pipe(vinylPaths(del));

	push = gulp.src([
			'dist/**/*'
		])
		.pipe($.ghPages({
			branch: 'gh-pages',
			message: commitMessage,
			force: true
		}));

	return merge(clean, push);
});

gulp.task('deploy', function (cb) {
	runSequence(['build', 'get-commit'], 'gh-pages', cb);
});

gulp.task('default', ['serve']);
