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
 * Copyright (c) 2010 Lars Boldt (larsboldt.com)
 * E-mail: boldt.lars@gmail.com
 * Version: 1.3
 * Released: 07.15.2010
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
                                    helper: false,
                                    activeItemClass: 'alrActiveItem',
                                    helperActiveItemClass: 'alrHelperActiveItem',
                                    helperInteraction: 'mouseover',
                                    startIndex: 0,
                                    nextItemElement: false,
                                    nextItemElementInteraction: 'click',
                                    previousItemElement: false,
                                    previousItemElementInteraction: 'click',
                                    randomEffect: false,
                                    randomEffects: new Array('blind', 'clip', 'explode', 'fade', 'fold'),
                                    debug: false,
                                    debugLevel: new Array('debug', 'info', 'warn', 'error')
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

        // Display first content
        c.$listRotator.children().each(function(index) {
            if (index == c.currentItem) {
                if (c.settings.effect == 'slide') {
                    var pos = '-' + c.currentItem*c.effectOptions.slideBy;
                    c.$listRotator.css('left', pos);
                }
                jQuery(this).show();
                jQuery(this).addClass(c.settings.activeItemClass);
                c.setHelperClass(c, index, true);
            }
        });

        // Loop all helper elements within the ul and bind mouseover/mouseout functionality to them
        if (jQuery(c.settings.helper).length > 0) {
            jQuery(c.settings.helper).children().each(function() {
                jQuery(this).bind(c.settings.helperInteraction, function() {
                    // Set userInteraction true
                    c.userInteraction = true;
                    // Stop rotationEngine
                    c.stopRotationEngine(c);
                    // Make sure currentEffect is actually set (certain configs might not set this value)
                    c.currentEffect = c.getItemEffect(c);
                    // Hide active content
                    if (c.currentEffect != 'slide' && c.currentEffect !== false) {
                        c.$listRotator.children().hide();
                    }
                    // Remove active class from helper
                    c.$listRotator.children().removeClass(c.settings.activeItemClass);
                    jQuery(c.settings.helper).children().removeClass(c.settings.helperActiveItemClass);
                    // Find position of current item
                    c.currentItem = jQuery(this).index();
                    // Show current content
                    c.$listRotator.children().each(function (index) {
                        if (index == c.currentItem) {
                            // Stop animations on this element
                            jQuery(this).stop();
                            
                            // Reset opacity incase animation was fade
                            jQuery(this).css('opacity', 1);
                            // Show element
                            jQuery(this).show();
                            
                            if (c.settings.effect == 'slide') {
                                c.runEffect(c, jQuery(this), false);
                            }

                            // Add active class to helper
                            jQuery(this).addClass(c.settings.activeItemClass);
                            c.setHelperClass(c, index, true);
                            return false;
                        }
                        return true;
                    });
                });
                jQuery(this).bind('mouseout', function() {
                    // Start rotationEngine
                    c.startRotationEngine(c);
                });
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

        // Start rotationEngine if autoStart is true
        if (c.settings.autoStart) {
            c.startRotationEngine(c);
        }
    },

    // rotationEngine
    rotationEngine: function(c) {
        // Stop rotationEngine
        c.stopRotationEngine(c);

        // Reset userInteraction
        c.userInteraction = false;

        // Hide open content
        c.$listRotator.children().each(function(index) {
            if (index == c.currentItem) {
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

                // Loop all li elements until you locate the new active item
                c.$listRotator.children().each(function (idx) {
                    // Is next item found?
                    if (idx == c.currentItem) {                      
                        // Show item
                        jQuery(this).show();
                        // Give it the active class
                        c.setHelperClass(c, idx, true);
                        // Remove active class from current active item
                        c.setHelperClass(c, index, false);

                        return false;
                    }
                    return true;
                });

                // Reset item index calculation
                c.calculateNextItem = true;

                // Run effect
                c.runEffect(c, jQuery(this), true);

                return false;
            }
            return true;
        });
    },

    continueRotation: function(c, e, h) {
        // Check if user interacted with helper during effect duration
        if (! c.userInteraction) {
            // Make sure the element is hidden when effect is done, not all effects end with hide
            if (h && c.currentEffect) {
                e.hide();
            }
            // Remove active class on previous active item
            e.removeClass(c.settings.activeItemClass);

            // Loop all li elements until you locate the new active item
            c.$listRotator.children().each(function (index) {
                // Is next item found?
                if (index == c.currentItem) {
                    // Give it the active class
                    jQuery(this).addClass(c.settings.activeItemClass);

                    return false;
                }
                return true;
            });

            // Start rotationEngine
            this.startRotationEngine(c);
        }
    },

    runEffect: function(c, e, runCallback) {
        // Set animationRunning flag to true
        c.animationRunning = true;
        // Make sure jQuery UI is installed before running UI effects, if fade effect or UI isn't installed, run the standard fadeOut effect
        c.currentEffect = c.getItemEffect(c);
        if (c.currentEffect == 'slide') {
            var pos = '-' + c.currentItem*c.effectOptions.slideBy;
            c.$listRotator.animate({left: pos}, c.getItemEffectTimer(c), 'swing', function() {
                // Animation done, reset animationRunning flag
                c.animationRunning = false;
                // Run callback?
                if (runCallback) {
                    c.continueRotation(c, e, false);
                }
            });
        } else if (e.effect && c.currentEffect != 'fade' && c.currentEffect !== false) {
            e.effect(c.currentEffect, c.getItemEffectOptions(c), c.getItemEffectTimer(c), function() {
                // Animation done, reset animationRunning flag
                c.animationRunning = false;
                // Run callback?
                if (runCallback) {
                    c.continueRotation(c, e, true);
                }
            });
        } else if (c.currentEffect == 'fade') {
            e.fadeOut(c.getItemEffectTimer(c), function() {
                // Animation done, reset animationRunning flag
                c.animationRunning = false;
                // Run callback?
                if (runCallback) {
                    c.continueRotation(c, e, true);
                }
            });
        } else {
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
                c.continueRotation(c, e, true);
            }
        }
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
        if (! c.settings.disableRotationEngine) {
            var rInt = c.getItemRotationInterval(c);
            c.tId = setInterval(function() {c.rotationEngine(c)}, rInt);
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
        // Move can only be done when animation isn't running
        if (! c.animationRunning) {
            // Make sure we intercept any ongoing animations with the userInteraction flag
            c.userInteraction = true;
            // Call the next item, rotationEngine will automatically figure out which item is next
            c.rotationEngine(c);
        }
    },

    moveToPreviousItem: function(c) {
        // Move can only be done when animation isn't running
        if (! c.animationRunning) {
            // Make sure we intercept any ongoing animations with the userInteraction flag
            c.userInteraction = true;
            // Setting calculate next item to false will tell rotationEngine to calculate the previous item instead
            c.calculateNextItem = false;
            c.rotationEngine(c);
        }
    },

    getItemObj: function(c) {
        //var actualItem = (c.currentItem > 0) ? c.currentItem-1 : c.totalItems-1;
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

    getItemEffectTimer: function(c) {
        var obj = c.getItemObj(c);
        if (obj !== false) {
            return (typeof(obj.effectTimer) == 'undefined') ? c.settings.effectTimer : obj.effectTimer;
        }
        return c.settings.effectTimer;
    },

    getItemEffectOptions: function(c) {
        var obj = c.getItemObj(c);
        if (obj !== false) {
            return (typeof(obj.effectOptions) == 'undefined') ? c.effectOptions : jQuery.extend({}, c.effectOptions, obj.effectOptions);
        }
        return c.effectOptions;
    },

    getItemRotationInterval: function(c) {
        var obj = c.getItemObj(c);
        if (obj !== false) {
            return (typeof(obj.rotationInterval) == 'undefined') ? c.settings.rotationInterval : obj.rotationInterval;
        }
        return c.settings.rotationInterval;
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
        var randomEffectNumber
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
    }
}