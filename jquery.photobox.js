/**
 * jQuery photobox plugin
 * This jQuery plugin was inspired by jQuery Lightbox 0.5 by Leandro Vieira Pinho (http://leandrovieira.com)
 * @name jquery.photobox.js
 * @author Pavel Sliusar - http://pdd.by/plugins/jquery/photobox/
 * @version 0.9
 * @requires jQuery
 * @date March 28, 2012
 * @category jQuery plugin
 * @copyright (c) 2012 Pavel Sliusar (pdd.by)
 * @license MIT
 * @example Visit http://pdd.by/plugins/jquery/photobox/
 */


/**
 *
 * TODO: Какая-нибудь анимация, все должно быть красиво
 *
 */

/**
* $ is an alias to jQuery object
*
*/
(function($) {
	/**
	 * Get width for all alements
	 *
	 */
	$.fn.computedWidth = function(settings) {
		var w = 0;
		this.each(function () {
			w += $(this).innerWidth();
		});

		return w;
	};

	/**
	 * Photobox
	 *
	 */
	$.fn.photobox = function(settings) {
		// if no elements - go away
		if (!this.length)
			return this;

		// default settings
		settings = $.extend({
			photo:     '',           // photo dimensions, can be something like '400x300' or '400' or 'x300', source image will be used if empty
			thumb:     '',           // thumbnail dimensions, source image will be used if empty
			thumbline: 'show',       // show | hide | auto - set thumbs visible or hidden or automatically (hide if there is only 1 photo)
			thumbs:    'photo',      // photo | dot - use previews or dots in thumbline
			status:    "-current-/-all-",  // current item string
			keyboard:  1,            // use keyboard shortcuts (ESC, left, right, space, backspace, PgDn, PgUp)
			totime:    0,            // time to update to resized window, if 0 - no timeout, update immediately
			//preload:   1,            // use the loading animation. Disable it if you want to load progressive JPEGs or PNGs

			// don't touch these params from outside
			photos:    [],           // array with photos (urls and titles)
			current:   -1,           // current photo index in array
			toresize:  null,         // timeout to update to resized window
			photoLoader: null        // loader for photos
		}, settings);

		// all matched elements
		var allPhotos = this;

		/**
		 * Very first function, starting from clicking link
		 *
		 * @return false
		 */
		function _start() {
			// replace strings with arrays
			if (typeof settings.thumb != "object")
				settings.thumb = settings.thumb.split('x');
			if (typeof settings.photo != "object")
				settings.photo = settings.photo.split('x');

			// open viewer
			_open(this, allPhotos);

			// stop event propagation
			return false;
		}

		/**
		 * Close and remove viewer, unbind all binded event handlers
		 *
		 */
		function _finish() {
			settings.current = -1;

			if (settings.keyboard)
				$(document).unbind('keydown', _keyDown);

			$(window).unbind('resize', _resize);
			$('#jquery-photobox-overlay > div').remove();
			$('#jquery-photobox-overlay').fadeOut(200, function() { $('#jquery-photobox-overlay').remove(); });

			// Show some elements to avoid conflict with overlay in IE. These elements appear above the overlay.
			$('.jquery-photobox-hidden').removeClass('jquery-photobox-hidden');
		}

		/**
		 * Open viewer
		 *
		 */
		function _open(anchor, allPhotos) {
			// Hide some elements to avoid conflict with overlay in IE. These elements appear above the overlay.
			$('embed, object, select').addClass('jquery-photobox-hidden');

			_addViewer(anchor, allPhotos);
		}

		/**
		 * Add viewer do document, bind event handlers
		 *
		 * @param anchor The object (link) which the user have clicked
		 * @param allPhotos The jQuery object with all elements matched
		 */
		function _addViewer(anchor, allPhotos) {
			var current = -1,
				l = allPhotos.length,
				lis = '',
				i;

			// generate thumbnails line and fill photos array
			for (i = 0; i < l; i++) {
				var url = allPhotos[i].href,
					title = allPhotos[i].title,
					img = $(allPhotos[i]).find('img');
				if (!title)
					if (img.length) {
						if (!(title = img.attr('title')))
							title = img.attr('alt');
					} else
						title = $(allPhotos[i]).text();

				if ((current < 0) && (anchor.href == url))
					current = i;

				settings.photos[i] = [url, title];
				if (!settings.thumb[0] && !settings.thumb[1]) {
					if ((settings.thumbs == 'dot') || !img.length)
						lis += '<li><a href="#" class="jquery-photobox-dot"></a></li>';
					else
						lis += '<li><a href="#"><img src="'+ img.attr('src') +'" /></a></li>';
				} else
					lis += '<li><a href="#"><img src="'+ _urlResized(url, settings.thumb[0], settings.thumb[1]) +'" /></a></li>';
			}

			// html for the viewer
			$('body').append(
				'<div id="jquery-photobox-overlay">'
					+ '<div class="jquery-photobox-inner">'
						+ '<a href="#" class="jquery-photobox-close"></a><a href="#" class="jquery-photobox-next"></a><a href="#" class="jquery-photobox-prev"></a>'
						+ '<div id="jquery-photobox"><img src="" /></div>'
						+ '<div class="jquery-photobox-thumbline">'
							+ '<div class="jquery-photobox-title">'
								// replace numbers in status string
								+ '<div>'+ settings.status.replace("-current-", '<span class="jquery-photobox-current"></span>').replace("-all-", '<span class="jquery-photobox-all">'+l+'</span>') +'</div>'
								+ '<strong></strong>'
							+ '</div>'
							+ '<div class="jquery-photobox-scroller"><ul id="jquery-photobox-thumbs"></ul></div>'
							+ '<div id="jquery-photobox-track"><div><b></b></div></div>'
						+ '</div>'
					+ '</div>'
				+ '</div>'
			);

			// setup overlay (dark background)
			var overlay = $('#jquery-photobox-overlay');
			overlay
				.fadeIn(250, function () {
					$('#jquery-photobox-overlay > div').css('visibility', 'visible');
				})
				// close viewer on click
				.click(function (evt) {
					if (evt.target.id != this.id) {
						evt.stopPropagation();
						return true;
					}
					_finish();
				})
				// prevent page scrolling
				.bind($.browser.mozilla ? 'DOMMouseScroll' : 'mousewheel', function (evt) { return false; })
				// get child div
				.children('div')
				// close viewer on click
				.click(function (evt) {
					if (evt.target.className != this.className) {
						evt.stopPropagation();
						return true;
					}
					_finish();
				})
				.children('.jquery-photobox-thumbline')
				// scroll thumbline
				.bind($.browser.mozilla ? 'DOMMouseScroll' : 'mousewheel', function (evt) {
					_scrollBy(_getWheelDelta(evt) > 0 ? -60 : 60);
					return false;
				});

			// switching photos with mouse wheel over photo
			$('#jquery-photobox')
				.bind($.browser.mozilla ? 'DOMMouseScroll' : 'mousewheel', function (evt) {
					if (_getWheelDelta(evt) > 0)
						_prevPhoto();
					else 
						_nextPhoto();

					return false;
				})
				.click(function () { _nextPhoto(); });

			// setup close button
			overlay.find('.jquery-photobox-close').click(function () { _finish(); return false; });

			// setup navigate buttons
			overlay.find('.jquery-photobox-prev').click(function () { _prevPhoto(); return false; });
			overlay.find('.jquery-photobox-next').click(function () { _nextPhoto(); return false; });

			// setup thumbnails line
			$('#jquery-photobox-thumbs')
				.html(lis)
				.click(function (evt) {
					var t = $(evt.target);

					// get LI as target
					if (t[0].tagName.toLowerCase().match(/img|b/))
						t = t.parent();
					if (t[0].tagName.toLowerCase() == 'a')
						t = t.parent();
					if (t[0].tagName.toLowerCase() != 'li')
						return false;

					// get LI position
					_photoUpdate(t.prevAll('li').length);

					return false;
				});


			// setup scrolling thumb
			var scthumb = $('#jquery-photobox-track div')
				.mousedown(function (evt) {
					this._dragX = evt.pageX - parseInt($(this).css('marginLeft'), 10);
					$('body').bind('mousemove', _thumbDrag);
					$('body').bind('mouseup', _thumbUp);
				});
			
			// disable text selection on drag
			_disableTextSelection($("#jquery-photobox-overlay .jquery-photobox-prev,#jquery-photobox-overlay .jquery-photobox-next,#jquery-photobox-track div,#jquery-photobox img"));

			// watch for window resize
			$(window).bind('resize', _resize);

			if (current < 0)
				current = 0;

			// bind keyboard events
			if (settings.keyboard)
				$(document).bind('keydown', _keyDown);

			if (l == 1)
				$('.jquery-photobox-title div').hide();

			if ((settings.thumbline == 'hide') || ((settings.thumbline == 'auto') && (l == 1)))
				$('.jquery-photobox-scroller,#jquery-photobox-track').hide();

			_update();
			_photoUpdate(current);
		}

		/**
		 * Dragging a scroller thumb
		 *
		 * @param evt Event
		 * @return false
		 */
		function _thumbDrag(evt) {
			var scthumb = $('#jquery-photobox-track div'),
				// calculation position for thumb
				p = Math.max(evt.pageX - scthumb[0]._dragX, 0);

			p = Math.min(p, scthumb[0]._dragT - scthumb[0]._dragW);
			scthumb.css('marginLeft', p+'px');

			// if thumb width equals track width
			if (scthumb[0]._dragT == scthumb[0]._dragW)
				p = 0;
			else
				// calculating offset
				p = p*(parseInt($('#jquery-photobox-thumbs').css('width'), 10) - scthumb[0]._dragT)/(scthumb[0]._dragT - scthumb[0]._dragW);

			// applying offset
			$('#jquery-photobox-thumbs').css('marginLeft', '-'+Math.round(p)+'px');

			return false;
		}

		/**
		 * Dropping scroller thumb
		 *
		 */
		function _thumbUp() {
			$('body').unbind('mousemove', _thumbDrag);
			$('body').unbind('mouseup', _thumbUp);
		}

		/**
		 * Update elements bounds
		 *
		 */
		function _update() {
			// calculate size and position for scroller thumb
			// and store some variables
			var track = $('#jquery-photobox-track'),
				tw = $('#jquery-photobox-overlay .jquery-photobox-scroller').width(),
				thumbs = $('#jquery-photobox-thumbs'),
				w = thumbs.find('li').computedWidth();

			if (w <= tw) {
				track.hide();
				thumbs.css('width', 'auto');
			} else {
				track.show();
				thumbs.css('width', w+'px');

				w = Math.round(tw*tw/w);
				w = Math.max(w, 40);

				var th = track.find('div').css('width', w + 'px');

				// thumb width
				th[0]._dragW = w;

				// track width
				th[0]._dragT = tw;
			}

			_updateScrollPos();

			// calculate position for photo
			var pb = $('#jquery-photobox');
			var photo = pb.find('img');

			// only when photo already visible
			if (photo.css('display') != 'none') {
				var w = parseInt(photo.attr('width'));
				var h = parseInt(photo.attr('height'));

				var pbo = $('#jquery-photobox-overlay');
				var pw = pbo.width();
				var ph = pbo.height();

				var hmargins = pb.outerWidth() - pb.innerWidth();
				var vmargins = (pb.outerHeight() - pb.innerHeight()) + $('.jquery-photobox-thumbline').outerHeight();
				pw -= hmargins;
				ph -= vmargins;

				// if photo dimensions larger than viewer area, correct that
				if ((w > pw) || (h > ph)) {
					var r = w/h;

					w = pw;
					h = w/r;

					if (h > ph) {
						h = ph;
						w = h*r;
					}
				}

				photo.css({
					'width': w +'px',
					'height': h +'px'
				});

				pb.css({
					'width': w +'px',
					'height': h +'px',
					'marginTop': - Math.round((h + vmargins)/2) +'px'
				});
			}

			// change size of navigation links
			w = Math.round(($('#jquery-photobox-overlay').width() - $('#jquery-photobox').outerWidth()) / 2);
			w = Math.max(w, 0);
			$('#jquery-photobox-overlay .jquery-photobox-prev,#jquery-photobox-overlay .jquery-photobox-next')
				.css('width', w +'px');
		}

		function _resize() {
			if (settings.totime > 0) {
				clearTimeout(settings.toresize);
				settings.toresize = setTimeout(_update, settings.totime);
			} else
				_update();
		}

		/**
		 * Get url for resized photo
		 *
		 * @param u Original url
		 * @param w New width
		 * @param h New height
		 * @param p Additional params ('p' - proportional resize, 'g' - grayscale)
		 * @return Url for resized photo
		 */
		function _urlResized(u, w, h, p) {
			if (!w && !h)
				return u;

			if (!w)
				w = '';
			if (!h)
				h = '';
			if (!p)
				p = '';

			// remove any existing resize
			u = u.replace(/(_[pg]*[0-9x]+)(\.[a-z]+)$/, "$2")
				// change path
				.replace(/(^.*\/)/, "$1resize/")
				// add new size
				.replace(/(\.[a-z]+)$/, "_"+p+w+"x"+h+"$1");

			return u;
		}

		/**
		 * Set new photo in viewer
		 *
		 * @param n Index of photo
		 */
		function _photoUpdate(n) {
			// if current photo already selected
			if (settings.current == n)
				return false;

			// hide photo to show loading,gif at background
			var photo = $('#jquery-photobox img').hide(),
				// get url for resized photo
				url = _urlResized(settings.photos[n][0], settings.photo[0], settings.photo[1]);

			// preload photo in temporary image
			// need to discover photo dimensions
			if (settings.photoLoader)
				settings.photoLoader.unbind('load');

			settings.photoLoader = $(new Image())
				.attr('src', url)
				.load(function () {
					photo
						.css({
							'width': this.width +'px',
							'height': this.height +'px'
						})
						// save original dimensions
						.attr({
							'width': this.width,
							'height': this.height,
							'src': this.src
						});
				});

			// update status
			$('#jquery-photobox-overlay .jquery-photobox-current').text(n+1);

			// if this is a first photo clicked
			if (settings.current < 0) {
				//_setActive(n);

				$('#jquery-photobox img').load(function () {
					$(this).show();
					_update();
				});

				// use temporary image to ensure when photo really loaded
				/*
				$(new Image())
					.attr('src', url)
					.load(function () { $('#jquery-photobox img').load(); });
				*/
			} else {
				//_setActive(n);
			}

			_setActive(n);

			settings.current = n;

			// show/hide navigation for first/last photo
			$('#jquery-photobox-overlay .jquery-photobox-prev').toggle(n > 0);
			$('#jquery-photobox-overlay .jquery-photobox-next').toggle(n < settings.photos.length - 1);

			// show or hide title for photo near status string
			if (settings.photos[n][1]) {
				$('#jquery-photobox-overlay .jquery-photobox-title strong').show().text(settings.photos[n][1]);
			} else {
				$('#jquery-photobox-overlay .jquery-photobox-title strong').hide();
			}

			_photoPreload(n);
		}

		/**
		 * Set active thumbnail in line
		 *
		 * @param n index of photo
		 */
		function _setActive(n) {
			// remove previous active
			$('#jquery-photobox-thumbs .jquery-photobox-active').removeClass('jquery-photobox-active');

			var thumbs = $('#jquery-photobox-thumbs'),
				active = thumbs.find('li:nth-child('+ (n+1) +')').addClass('jquery-photobox-active'),
				track = $('#jquery-photobox-track');

			if (track.css('display') == 'none')
				return;

			// check if new active thumbnail placed outside visible area
			// and scroll to it
			var scthumb = $('#jquery-photobox-track div'),
				tm = parseInt(thumbs.css('marginLeft'), 10),
				l = active.position().left - parseInt(thumbs.css('marginLeft'), 10) - scthumb.position().left;

			// to right of visible area
			if (l + tm + active.outerWidth() > scthumb[0]._dragT) {
				thumbs.css('marginLeft', (scthumb[0]._dragT - l - active.outerWidth())+'px');
				_updateScrollPos();
			} else if (l < -tm) { // to left
				thumbs.css('marginLeft', (-l)+'px');
				_updateScrollPos();
			}
		}

		/**
		 * Preload photos on left and right sides of current photo
		 *
		 * @param n Index of photo
		 */
		function _photoPreload(n) {
			if (n < settings.photos.length - 1) {
				var imgNext = new Image();
				imgNext.src = _urlResized(settings.photos[n + 1][0], settings.photo[0], settings.photo[1]);
			}
			if (n > 0) {
				var imgPrev = new Image();
				imgPrev.src = _urlResized(settings.photos[n -1][0], settings.photo[0], settings.photo[1]);
			}
		}

		/**
		 * Navigate to next photo
		 *
		 */
		function _nextPhoto() {
			if (settings.photos.length == 1) {
				_finish();
				return false;
			}

			_photoUpdate(settings.current < settings.photos.length-1 ? settings.current+1 : 0);
		}

		/**
		 * Navigate to previous photo
		 *
		 */
		function _prevPhoto() {
			if (settings.photos.length == 1) {
				_finish();
				return false;
			}

			_photoUpdate(settings.current > 0 ? settings.current-1 : settings.photos.length-1);
		}

		/**
		 * Update scroller thumb position depending on thumbsline margin
		 *
		 */
		function _updateScrollPos() {
			var track = $('#jquery-photobox-track');

			// if scroller is visible
			if (track.css('display') != 'none') {
				var thumb = track.children('div'),
					p = 0,
					thumbs = $('#jquery-photobox-thumbs'),
					tm = -parseInt(thumbs.css('marginLeft'), 10),
					tw = parseInt(thumbs.css('width'), 10);

				p = tm*(thumb[0]._dragT - thumb[0]._dragW)/(tw - thumb[0]._dragT);
				p = Math.round(p);
				p = Math.max(p, 0);
				p = Math.min(p, thumb[0]._dragT - thumb[0]._dragW);

				// check thumbline position
				if (tw-tm < thumb[0]._dragT) {
					tm = Math.min(thumb[0]._dragT-tw, 0);
					thumbs.css('marginLeft', tm+'px');
				}

				thumb.css('marginLeft', p+'px');
			}
		}

		/**
		 * Scroll visible area of thumbnails
		 *
		 * @param n Amount of scroll, in pixels
		 */
		function _scrollBy(n) {
			var track = $('#jquery-photobox-track');
			if (track.css('display') == 'none')
				return;

			var thumb = track.find('div'),
				thumbs = $('#jquery-photobox-thumbs'),
				tw = parseInt(thumbs.css('width'), 10),
				tm = -parseInt(thumbs.css('marginLeft'), 10);

			n = Math.max(tm+n, 0);
			n = Math.min(-thumb[0]._dragT + tw, n);

			if (n == tm)
				return false;

			if (!isNaN(n))
				$('#jquery-photobox-thumbs').css('marginLeft', -n+'px');

			// and update scroller thumb position
			_updateScrollPos();
		}

		/**
		 * Key handling
		 *
		 */
		function _keyDown(evt) {
			var keycode = evt.keyCode || window.event.keyCode,
				escapeKey = evt.DOM_VK_ESCAPE || 27;

			switch (keycode) {
				case 8:
				case 33:
				case 37:
					_prevPhoto();
					return false;

				case 32:
				case 34:
				case 39:
					_nextPhoto();
					return false;

				case escapeKey:
					_finish();
					return false;

				case 38:
				case 40:
					return false;
			}
		}

		/**
		 * Get mouse wheel scroll delta from event
		 *
		 */
		function _getWheelDelta(evt) {
			evt = evt || window.event;

			// for new jQuery
			if (evt.originalEvent)
				evt = evt.originalEvent;

			if (evt.wheelDelta)
				return evt.wheelDelta/120;
			if (evt.detail)
				return -evt.detail/3;
		}

		/**
		 * Disable text selection
		 *
		 */
		function _disableTextSelection(elts) {
			elts.css('-moz-user-select', 'none');
			var i, l = elts.length;
			for (i = 0; i < l; i++) {
				elts[i].onselectstart = function() { return false; };
				elts[i].unselectable = "on";
			}
		}

		// Return the jQuery object for chaining. The unbind method is used to avoid click conflict when the plugin is called more than once
		return this.unbind('click').click(_start);
	};
})(jQuery);