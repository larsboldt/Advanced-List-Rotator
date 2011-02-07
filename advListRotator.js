if (typeof Object.create !== 'function') {
    Object.create = function (o) {
        function F() {}
        F.prototype = o;
        return new F();
    };
}
(function($){
    $.fn.extend({
        advListRotator: function(options) {
            if (this.length) {
                return this.each(function() {
                    var obj = Object.create(AdvancedListRotatorClass);
                    obj.init(this, options);
                    $.data(this, 'advListRotator', AdvancedListRotatorClass);
                });
            }
            return false;
        }
    });
})(jQuery);

/* Advanced List Rotator
 * Copyright (c) 2010-2011 Lars Boldt (larsboldt.com)
 * E-mail: boldt.lars@gmail.com
 * Version: 1.4 RC2
 * Released: 31.01.2011
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */
var AdvancedListRotatorClass = {
    init: function(element, options) {
        // Store "this" for reference
        var c = this;
        // Settings
        c.settings = jQuery.extend({
            rotationInterval: 5000,
            effectTimer: 1000,
            effect: false,
            effectOptions: {},
            itemControl: {},
            shuffle: false,
            randomStart: false,
            autoStart: true,
            disableRotationEngine: false,
            stopOnInteraction: false,
            startOnInteraction: false,
            helper: false,
            activeItemClass: 'alrActive',
            inactiveItemClass: 'alrInactive',
            helperActiveItemClass: 'alrHelperActiveItem',
            helperInteraction: 'mouseover',
            helperInteractionAnimate: false,
            startIndex: 0,
            currentItemElement: false,
            totalItemsElement: false,
            stopRotationElement: false,
            stopRotationElementInteraction: 'click',
            startRotationElement: false,
            startRotationElementInteraction: 'click',
            nextItemElement: false,
            nextItemElementInteraction: 'click',
            previousItemElement: false,
            previousItemElementInteraction: 'click',
            randomEffect: false,
            randomEffects: new Array('blind', 'clip', 'explode', 'fade', 'fold'),
            debug: false,
            debugLevel: new Array('debug', 'info', 'warn', 'error'),
            unevenHeightsFix: false
        }, c.settings, options);
        // Effect options
        c.effectOptions = jQuery.extend({}, c.effectOptions, c.settings.effectOptions);

        // Effect control
        c.itemControl = jQuery.extend({}, c.itemControl, c.settings.itemControl);

        // Store element for reference, both normal and jQuery
        c.listRotator = element;
        c.$listRotator = jQuery(element);
        // Total items (li's in ul)
        c.totalItems = c.$listRotator.find('li').length;
        // Current item
        c.currentItem = (c.settings.startIndex >= 0 && c.settings.startIndex < c.totalItems) ? c.settings.startIndex : 0;
        // Current effect
        c.currentEffect = false;
        // Shuffle array
        c.shuffledItems = new Array();
        // Timer
        c.tId = null;
        // User interaction
        c.userInteraction = false;
        // Calculate next item index (we use this flag to skip calculating next item index when we move backwards)
        c.calculateNextItem = true;
        // Is animation running
        c.animationRunning = false;
        // Rotation
        c.rotation = false;
        // Random start
        if (c.settings.randomStart) {
            c.currentItem = c.random(c.totalItems);
        }
        // Add currentItem to shuffle list to avoid showing item twice the first round
        c.shuffledItems.push(c.currentItem);
        // previousItem prevents shuffle ending and starting on the same item
        c.previousItem = c.currentItem;

        // Debug?
        if (c.settings.debug && c.in_array('debug', c.settings.debugLevel)) {
            console.debug('init: totalItems: ' + c.totalItems);
            console.debug('init: startIndex: ' + c.currentItem);
            if (c.settings.shuffle) {
                console.debug('init: Pushed ' + c.currentItem + ' into shufflelist');
            }
        }

        // Initializes items based on current effect
        c.currentEffect = c.getItemEffect(c);
        c.onInitItem(c);

        // Bind events to main list items
        c.$listRotator.children().each(function() {
            if (c.settings.stopOnInteraction !== false) {
                jQuery(this).bind(c.settings.stopOnInteraction, function() {
                    // Stop (pause) rotationEngine
                    c.stopRotationEngine(c);
                });
            }
            if (c.settings.startOnInteraction !== false) {
                jQuery(this).bind(c.settings.startOnInteraction, function() {
                    // Start rotationEngine
                    c.startRotationEngine(c);
                });
            }
        });

        // Loop all helper elements within the ul and bind event functionality to them
        if (jQuery(c.settings.helper).length > 0) {
            jQuery(c.settings.helper).children().each(function() {
                jQuery(this).bind(c.settings.helperInteraction, function() {
                    c.interaction(c, jQuery(this), false);
                });
                jQuery(this).bind('mouseout', function() {
                    // Start rotationEngine
                    c.startRotationEngine(c);
                });
            });
        }

        // Bind functionality to startItemElement
        if (jQuery(c.settings.startRotationElement).length > 0) {
            jQuery(c.settings.startRotationElement).bind(c.settings.startRotationElementInteraction, function() {
                c.rotation = true;
                c.startRotationEngine(c);
            });
        }

        // Bind functionality to stopItemElement
        if (jQuery(c.settings.stopRotationElement).length > 0) {
            jQuery(c.settings.stopRotationElement).bind(c.settings.stopRotationElementInteraction, function() {
                c.rotation = false;
                c.stopRotationEngine(c);
            });
        }

        // Bind functionality to nextItemElement
        if (jQuery(c.settings.nextItemElement).length > 0) {
            jQuery(c.settings.nextItemElement).bind(c.settings.nextItemElementInteraction, function() {
                c.moveToNextItem(c);
            });
        }

        // Bind functionality to previousItemElement
        if (jQuery(c.settings.previousItemElement).length > 0) {
            jQuery(c.settings.previousItemElement).bind(c.settings.previousItemElementInteraction, function() {
                c.moveToPreviousItem(c);
            });
        }

        // update labels
        c.updateLabels(c);

        // Start rotationEngine if autoStart is true
        if (c.settings.autoStart) {
            c.rotation = true;
            c.startRotationEngine(c);
        }
    },

    rotationEngine: function(c) {
        // Stop rotationEngine
        c.stopRotationEngine(c);

        // Reset userInteraction
        c.userInteraction = false;

        // Get current item obj
        var e = c.getCurrentItemObj(c);
        // Remove active class
        c.setHelperClass(c, c.currentItem, false);

        // Should we calculate next item index?
        if (c.calculateNextItem) {
            // Is shuffle set?
            if (c.settings.shuffle) {
                // Get a random item, but make sure every item is shown in each rotation
                c.currentItem = c.shuffleRotationEngine(c, c.totalItems);
            } else {
                // Activate next item
                c.currentItem++;
                // Make sure currentItem resets at the end of the itemlist
                c.currentItem = (c.currentItem >= c.totalItems) ? 0 : c.currentItem;
            }
        } else {
            // Calculate previous item index instead
            // Going backwards is alittle more complicated because of shuffle
            // Is shuffle enabled?
            if (c.settings.shuffle) {
                // Now we need to find the previous previous item based on the shuffleItems list
                if (c.shuffledItems.length >= 1) {
                    for (var j=0; j < c.shuffledItems.length; j++) {
                        if (c.shuffledItems[j] == c.previousItem) {
                            // Moving backwards in the shuffledItems list will only hold true until we reach zero.
                            // At this point you will get a random item if you keep going backwards
                            // However, this is complicated by the fact that shuffledItems is reset at the last item.
                            // Moving backwards when you are at the last item in the current shuffle gives you a
                            // random item
                            do {
                                j--;
                                c.previousItem = (j < 0) ? c.shuffleRotationEngine(c, c.totalItems) : c.shuffledItems[j];
                            } while (c.currentItem == c.previousItem);
                            break;
                        }
                    }
                } else {
                    // shuffledItems was reset.
                    c.previousItem = c.shuffleRotationEngine(c, c.totalItems);
                }
                // Set currentItem to the previous shuffled item
                c.currentItem = c.previousItem;
            } else {
                // Move index back once
                c.currentItem--;
                // Once index goes below zero we simply move it to the last item in the list, creating an endless loop
                c.currentItem = (c.currentItem < 0) ? (c.totalItems-1) : c.currentItem;
            }
        }

        // Set active helper class
        c.setHelperClass(c, c.currentItem, true);

        // Reset item index calculation
        c.calculateNextItem = true;

        // update labels
        c.updateLabels(c);

        // Run effect
        c.runEffect(c, e, c.rotation);
    },

    continueRotation: function(c) {
        // Check if user interacted with helper during effect duration
        if (! c.userInteraction) {
            // Set item classes
            c.setItemClass(c);
            // Start rotationEngine
            c.startRotationEngine(c);
        }
    },

    runEffect: function(c, e, runCallback) {
        // Set animationRunning flag to true
        c.animationRunning = true;
        // Make sure jQuery UI is installed before running UI effects, fallback is no effect
        c.currentEffect = c.getItemEffect(c);

        c.$listRotator.children().removeClass(c.settings.inactiveItemClass).removeClass('alrEffect');
        c.$listRotator.children().addClass(c.settings.inactiveItemClass);

        switch (c.currentEffect) {
            case 'slide':
                c.effectSlide(c, e, runCallback);
                break;
            case 'slice':
                c.effectSlice(c, e, runCallback);
                break;
            case 'fade':
                c.effectFade(c, e, runCallback);
                break;
            default:
                if (e.effect && c.currentEffect !== false) {
                    c.effectUI(c, e, runCallback);
                } else {
                    c.effectNone(c, e, runCallback);
                }
        }
    },

    interaction: function(c, e, i) {
        // Set userInteraction true
        c.userInteraction = true;
        // Stop rotationEngine
        c.stopRotationEngine(c);
        // Make sure currentEffect is actually set (certain configs might not set this value)
        c.currentEffect = c.getItemEffect(c);        
        // Call onBeforeShowItem which handle inactive items based on effect in use
        c.onBeforeShowItem(c);
        // Remove active class from helper
        c.$listRotator.children().removeClass(c.settings.activeItemClass);
        jQuery(c.settings.helper).children().removeClass(c.settings.helperActiveItemClass);
        // Find position of current item
        if (e !== false) {
            c.currentItem = e.index();
        } else {
            c.currentItem = i;
        }
        // Call onShowItem which handle how an item is shown based on effect in use
        c.onShowItem(c);
        // Set active helper class
        c.setHelperClass(c, c.currentItem, true);
    },

    stopRotationEngine: function(c) {
        // Stop rotationEngine
        if (c.tId) {
            clearInterval(c.tId);
            c.tId = null;
            // Debug?
            if (c.settings.debug && c.in_array('info', c.settings.debugLevel)) {
                console.info('stopRotationEngine: Rotation Engine stopped');
            }
        }
    },

    startRotationEngine: function(c) {
        // Stop rotationEngine
        c.stopRotationEngine(c);
        // Start rotationEngine as long as disableRotationEngine is false
        if (! c.settings.disableRotationEngine && c.totalItems > 1) {
            var rInt = c.getItemOption(c, 'rotationInterval', c.settings.rotationInterval);
            c.tId = setInterval(function() {
                c.rotationEngine(c)
            }, rInt);
            // Debug?
            if (c.settings.debug && c.in_array('info', c.settings.debugLevel)) {
                console.info('startRotationEngine: Rotation Engine started; interval ' + rInt + '; currentItem ' + c.currentItem);
            }
        }
    },

    shuffleRotationEngine: function(c, max) {
        // Number holds the random generated number
        var number = c.random(max);
        // Loop until we get a random number that has not been used in this rotation or was the last number of the previous rotation
        while (c.in_array(number, c.shuffledItems) || number == c.previousItem) {
            // Generate a new number until we get the one we want
            number = c.random(max);
        }
        // Set generated number to previousItem
        c.previousItem = number;
        // Add generated number to shuffle list to avoid showing it twice or more each rotation
        c.shuffledItems.push(number);
        // Reset shuffle list if we've been through all the items
        if (c.shuffledItems.length == c.totalItems) {
            c.shuffledItems = new Array();
        }
        // Debug?
        if (c.settings.debug && c.in_array('debug', c.settings.debugLevel)) {
            console.debug('shuffleRotationEngine: Number ' + number + ' generated');
            if (c.shuffledItems.length <= 0) {
                console.debug('shuffleRotationEngine: Shufflelist was reset');
            }
        }
        // Return generated number
        return number;
    },

    in_array: function(needle, haystack) {
        // Returns true if needle is in haystack
        for (n in haystack) {
            if (haystack[n] == needle) {
                return true;
            }
        }
        return false;
    },

    random: function(max) {
        // Return a number between 0 and "max"
        return Math.floor(Math.random()*max);
    },

    setItemClass: function(c) {
        // Remove active class
        c.$listRotator.children().removeClass(c.settings.activeItemClass);
        // Add active itemclass
        var obj = c.getCurrentItemObj(c);
        if (obj) {
            obj.addClass(c.settings.activeItemClass);
        }
    },

    setHelperClass: function(c, n, status) {
        // Make sure helper object is set
        if (jQuery(c.settings.helper).length > 0) {
            // Loop childs of helper object
            jQuery(c.settings.helper).children().each(function(index) {
                // Find the correct child
                if (index == n) {
                    // Toggle class
                    if (status) {
                        jQuery(this).addClass(c.settings.helperActiveItemClass);
                    } else {
                        jQuery(this).removeClass(c.settings.helperActiveItemClass);
                    }
                    return false;
                }
                return true;
            });
        }
        return false;
    },

    moveToNextItem: function(c) {
        /*
        c.stopCurrentItemAnimation(c);
        // Move can only be done when animation isn't running
        if (! c.animationRunning) {
            // Make sure we intercept any ongoing animations with the userInteraction flag
            c.userInteraction = true;
            // Call the next item, rotationEngine will automatically figure out which item is next
            c.rotationEngine(c);
        }*/
        var nextItem = c.currentItem+1;
        nextItem = (nextItem > c.totalItems-1) ? 0 : nextItem;
        c.interaction(c, false, nextItem);
    },

    moveToPreviousItem: function(c) {
        /*
        c.stopCurrentItemAnimation(c);
        // Move can only be done when animation isn't running
        if (! c.animationRunning) {
            // Make sure we intercept any ongoing animations with the userInteraction flag
            c.userInteraction = true;
            // Setting calculate next item to false will tell rotationEngine to calculate the previous item instead
            c.calculateNextItem = false;
            c.rotationEngine(c);
        }*/
        var previousItem = c.currentItem-1;
        previousItem = (previousItem < 0) ? c.totalItems-1 : previousItem;
        c.interaction(c, false, previousItem);
    },

    stopCurrentItemAnimation: function(c) {
        var obj = c.getCurrentItemObj(c);
        obj.stop(true, true);
        c.animationRunning = false;
    },

    getCurrentItemObj: function(c) {
        var obj = false;
        // Loop all li elements until you locate the new active item
        c.$listRotator.children().each(function (index) {
            // Is next item found?
            if (index == c.currentItem) {
                // Set item as jQuery obj
                obj = jQuery(this);
                return false;
            }
            return true;
        });
        return obj;
    },

    getItemObj: function(c) {
        var obj = eval("c.itemControl.listIndex_" + c.currentItem);
        return (typeof(obj) == 'undefined') ? false : obj;
    },

    getItemEffect: function(c) {
        var obj = c.getItemObj(c);
        if (obj !== false) {
            if (typeof(obj.randomEffect) != 'undefined' && obj.randomEffect) {
                return c.getRandomItemEffect(c, obj);
            } else if (typeof(obj.effect) != 'undefined') {
                // Debug?
                if (c.settings.debug) {
                    console.debug('getItemEffect: itemControl effect found; Using ' + obj.effect + ' for item ' + c.currentItem);
                }
                return obj.effect;
            }
        }
        return c.getRandomEffect(c);
    },

    getItemEffectOptions: function(c) {
        var obj = c.getItemObj(c);
        if (obj !== false) {
            return (typeof(obj.effectOptions) == 'undefined') ? c.effectOptions : jQuery.extend({}, c.effectOptions, obj.effectOptions);
        }
        return c.effectOptions;
    },

    getItemEffectEasing: function(c, e) {
        var opts = c.getItemEffectOptions(c);
        return (typeof(opts.easing) != 'undefined' && e.effect) ? opts.easing : 'swing';
    },

    getItemOption: function(c, o, d) {
        var obj = c.getItemObj(c);
        if (obj !== false) {
            return (typeof(obj[o]) != 'undefined') ? obj[o] : d;
        }
        return d;
    },

    getItemEffectOption: function(c, o, d) {
        var opts = c.getItemEffectOptions(c);
        return (typeof(opts[o]) != 'undefined') ? opts[o] : d;
    },

    getRandomEffect: function(c) {
        if (c.settings.randomEffect) {
            var randomEffectNumber = c.random(c.settings.randomEffects.length);
            // Debug?
            if (c.settings.debug) {
                console.debug('getRandomEffect: true; Using ' + c.settings.randomEffects[randomEffectNumber] + ' for item ' + c.currentItem);
            }
            return c.settings.randomEffects[randomEffectNumber];
        }
        // Debug?
        if (c.settings.debug) {
            var effect = (c.settings.effect) ? c.settings.effect : 'none';
            console.debug('getRandomEffect: false; Using ' + effect + ' for item ' + c.currentItem);
        }
        return c.settings.effect;
    },

    getRandomItemEffect: function(c, obj) {
        var randomEffectNumber;
        if (typeof(obj.randomEffects) != 'undefined') {
            randomEffectNumber = c.random(obj.randomEffects.length);
            // Debug?
            if (c.settings.debug) {
                console.debug('getRandomItemEffect: found itemControl randomEffects; Using ' + obj.randomEffects[randomEffectNumber] + ' for item ' + c.currentItem);
            }
            return obj.randomEffects[randomEffectNumber];
        }
        randomEffectNumber = c.random(c.settings.randomEffects.length);
        // Debug?
        if (c.settings.debug) {
            console.debug('getRandomItemEffect: no itemControl randomEffects, using standard; Using ' + c.settings.randomEffects[randomEffectNumber] + ' for item ' + c.currentItem);
        }
        return c.settings.randomEffects[randomEffectNumber];
    },

    onInitItem: function(c) {
        // Get current item
        var obj = c.getCurrentItemObj(c);
        if (obj) {
            switch (c.currentEffect) {
                case 'slide':
                    var pos = '-' + c.currentItem*c.getItemEffectOption(c, 'slideBy', 10);
                    c.$listRotator.css('left', pos);
                    break;
            }
            // Add active class
            obj.addClass(c.settings.activeItemClass);
            // Add active class to helper
            c.setHelperClass(c, c.currentItem, true);
        }
    },

    onBeforeShowItem: function(c) {},

    onShowItem: function(c) {
        // Get current item
        var obj = c.getCurrentItemObj(c);
        if (obj) {
            switch (c.currentEffect) {
                case 'slide':
                    c.runEffect(c, obj, false);
                    break;
                case 'fade':
                    if (c.settings.unevenHeightsFix) {
                        c.$listRotator.children().addClass(c.settings.inactiveItemClass).removeClass('alrEffect');
                        obj.removeClass(c.settings.inactiveItemClass);
                    }
                    if (c.settings.helperInteractionAnimate) {
                        c.runEffect(c, obj, c.rotation);
                    }
                    break;
                default:
                    if (c.settings.helperInteractionAnimate) {
                        c.runEffect(c, obj, c.rotation);
                    }
                    break;
            }
            // Add active class
            obj.addClass(c.settings.activeItemClass);
        }
    },

    alrArrayAnimate: function(c, e, p, a, o, s, t, r) {
        var i = (!r) ? 0 : a.length-1;
        var j = 0;
        var eInt = setInterval(function() {
            if (!r) {
                if (i >= a.length) {
                    clearInterval(eInt);
                    return;
                }
            } else {
                if (i < 0) {
                    clearInterval(eInt);
                    return;
                }
            }
            a[i].animate(o, s, function() {
                if (j >= a.length-1) {
                    // Stop interval
                    clearInterval(eInt);
                    // Animation done, reset animationRunning flag
                    c.animationRunning = false;
                    // Hide previous element
                    e.hide();
                    // Remove effect
                    jQuery('.alrEffectSlice').remove();
                    // Run callback?
                    if (p) {
                        c.continueRotation(c);
                    }

                    c.$listRotator.children().removeClass(c.settings.activeItemClass);
                    var obj = c.getCurrentItemObj(c);
                    obj.removeClass(c.settings.inactiveItemClass).addClass(c.settings.activeItemClass);
                    c.showNoAnimationContent(c, obj);
                }
                j++
            });
            i = (!r) ? i+=1 : i-=1;
        }, t);
    },

    updateLabels: function(c) {
        if (c.settings.currentItemElement !== false) {
            jQuery(c.settings.currentItemElement).html(c.currentItem+1);
        }
        if (c.settings.totalItemsElement !== false) {
            jQuery(c.settings.totalItemsElement).html(c.totalItems);
        }
    },

    effectFade: function(c, e, runCallback) {
        var obj = c.getCurrentItemObj(c);
        c.hideNoAnimationContent(c, obj);

        if (c.settings.unevenHeightsFix) {
            obj.removeClass(c.settings.inactiveItemClass);
        }
        obj.css('opacity', 0).addClass('alrEffect').show();

        obj.animate({
            'opacity': 1
        }, c.getItemEffectOption(c, 'effectTimer', c.settings.effectTimer), function() {
            // Animation done, reset animationRunning flag
            c.animationRunning = false;
            // Run callback?
            if (runCallback) {
                c.continueRotation(c);
            }
            c.$listRotator.children().removeClass(c.settings.activeItemClass);
            obj.removeClass('alrEffect').addClass(c.settings.activeItemClass);
            c.showNoAnimationContent(c, obj);
        });
    },

    effectSlide: function(c, e, runCallback) {
        // Cancel all running animations on the listRotator obj
        c.$listRotator.stop();
        // Calculate the new position
        var pos = '-' + c.currentItem*c.getItemEffectOption(c, 'slideBy', 10);
        var animOpts = (c.getItemEffectOption(c, 'slideVertical', false)) ? {
            top: pos
        } : {
            left: pos
        };
        // Slide listRotator obj to the new position
        c.$listRotator.animate(animOpts, c.getItemEffectOption(c, 'effectTimer', c.settings.effectTimer), c.getItemEffectEasing(c, e), function() {
            // Animation done, reset animationRunning flag
            c.animationRunning = false;
            // Run callback?
            if (runCallback) {
                c.continueRotation(c);
            }
        });
    },

    effectSlice: function(c, e, runCallback) {
        var obj = c.getCurrentItemObj(c);        
        obj.show();
        c.hideNoAnimationContent(c, obj);

        var objWidth       = obj.width();
        var objHeight      = obj.height();
        var sliceCount     = c.getItemEffectOption(c, 'sliceCount', 10);
        var sliceWidth     = Math.round(objWidth/sliceCount);
        var sliceHeight    = Math.round(objHeight/sliceCount);
        var sliceDirection = c.getItemEffectOption(c, 'sliceDirection', 'bottom');
        var o              = {};
        var sliceInc       = 0;
        var sliceSize      = 0;

        // Add the li element which will hold the slices
        c.$listRotator.append('<li class="alrEffectSlice"><div class="alrEffectSliceContent"></div></li>');

        switch (sliceDirection) {
            case 'bottom':
            case 'top':
                sliceInc  = sliceWidth;
                sliceSize = objWidth;
                break;
            case 'left':
            case 'right':
                sliceInc  = sliceHeight;
                sliceSize = objHeight;
                break;
        }

        for (var j=0; j < sliceSize; j+=sliceInc) {
            switch (sliceDirection) {
                case 'bottom':
                    jQuery('.alrEffectSliceContent').append('<div class="alrEffectSliceWrapper" style="height: ' + objHeight + 'px; left: ' + j + 'px; width:' + sliceWidth + 'px;"><div style="height: 0; margin-left: -' + j + 'px;" class="alrEffectSliceA">' + obj.html() + '</div></div>');
                    break;
                case 'top':
                    jQuery('.alrEffectSliceContent').append('<div class="alrEffectSliceWrapper" style="height: ' + objHeight + 'px; left: ' + j + 'px; width:' + sliceWidth + 'px;"><div style="margin-top: '+ objHeight + 'px; margin-left: -' + j + 'px;" class="alrEffectSliceA">' + obj.html() + '</div></div>');
                    break;
                case 'left':
                    jQuery('.alrEffectSliceContent').append('<div class="alrEffectSliceWrapper" style="height: ' + sliceHeight + 'px; top: ' + j + 'px; width:' + objWidth + 'px;"><div style="width: 0; margin-top: -' + j + 'px;" class="alrEffectSliceA">' + obj.html() + '</div></div>');
                    break;
                case 'right':
                    jQuery('.alrEffectSliceContent').append('<div class="alrEffectSliceWrapper" style="height: ' + sliceHeight + 'px; top: ' + j + 'px; width:' + objWidth + 'px;"><div style="margin-left: '+ objWidth +'px; margin-top: -' + j + 'px;" class="alrEffectSliceA">' + obj.html() + '</div></div>');
                    break;
            }
        }

        jQuery('.alrEffectSliceA').css('opacity', 0);
        jQuery('.alrEffectSliceA').show();

        switch (sliceDirection) {
            case 'bottom':
                o = {
                    opacity: 1,
                    height: [objHeight + 'px', c.getItemEffectEasing(c, e)]
                };
                break;
            case 'top':
                o = {
                    opacity: 1,
                    marginTop: ['0px', c.getItemEffectEasing(c, e)]
                };
                break;
            case 'left':
                o = {
                    opacity: 1,
                    width: [objWidth + 'px', c.getItemEffectEasing(c, e)]
                };
                break;
            case 'right':
                o = {
                    opacity: 1,
                    marginLeft: ['0px', c.getItemEffectEasing(c, e)]
                };
                break;
        }

        var a = new Array();
        jQuery('.alrEffectSliceA').each(function() {
            a.push(jQuery(this));
        });

        c.alrArrayAnimate(c, e, runCallback, a, o,
            c.getItemEffectOption(c, 'effectTimer', c.settings.effectTimer),
            c.getItemEffectOption(c, 'sliceSpeed', 100),
            c.getItemEffectOption(c, 'sliceReverse', false));
    },

    effectUI: function(c, e, runCallback) {
        var obj = c.getCurrentItemObj(c);        
        obj.show();
        c.hideNoAnimationContent(c, obj);

        e.effect(c.currentEffect, c.getItemEffectOptions(c), c.getItemEffectOption(c, 'effectTimer', c.settings.effectTimer), function() {
            // Hide item
            e.hide();
            // Animation done, reset animationRunning flag
            c.animationRunning = false;
            // Run callback?
            c.showNoAnimationContent(c, obj);
            if (runCallback) {
                c.continueRotation(c);
            }
        });
    },

    effectNone: function(c, e, runCallback) {
        // Debug?
        if (c.settings.debug) {
            if (c.currentEffect !== false) {
                console.debug('runEffect: Missing jQuery UI effects; Cannot run ' + c.currentEffect + '; Using none');
            }
        }
        // Animation done, reset animationRunning flag
        c.animationRunning = false;
        // Run callback?
        if (runCallback) {
            c.continueRotation(c);
        }
    },

    hideNoAnimationContent: function(c, obj) {
        obj.find('.alrNoAnimation').hide();
    },

    showNoAnimationContent: function(c, obj) {
        obj.find('.alrNoAnimation').fadeIn(300);
    }
}