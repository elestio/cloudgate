
var _fleeqPlayerData = [];
if(typeof window._fleeqPlayer !== "undefined"){
    _fleeqPlayerData = window._fleeqPlayer;
}
var _fleeqPlayer = {
    expID : false,
    currentScreen: 1,
    numberOfScreens: 1,
    transitionTiming: 1,
    currTTimer: -1,
    currTTimerAll: [],
    currTTimerAllInner: [],
    factor: 1,
    screenSize : { w : 1, h : 1},
    elementsOrder : [],
    screensTransitions : [],
    recordFlag: false,
    runFastLoopFlag: false,
    playerReady: false,
    push: function(data) {
        let key;
        for(key in data){
            if(data.hasOwnProperty(key)
                && _fleeqPlayer.hasOwnProperty(key)){
                if(typeof _fleeqPlayer[key] == 'function'){
                    _fleeqPlayer[key](data[key]);
                }else{
                    _fleeqPlayer[key] = data[key];
                }
            }
        }
    },
    init: function(preLoadData) {
        let i, pldLength = preLoadData.length;
        for(i = 0; i < pldLength; i++){
            _fleeqPlayer.push(preLoadData[i]);
        }
        // this._createPlayerUI();
    },
    createPlayerUI: function() {
        this.playerReady = false;
        this._setZIndexPerScreen(0);
        //$('body').css('background-color', 'black');
        $('.iPhoneScreen.guideElement').closest('body').css('margin', '0px');
        $('.iPhoneScreen.guideElement.0 > div ,  .iPhoneScreen.guideElement.0 > span').each(function(i , elm){
            _fleeqPlayer._storeValues($(elm));
        });
        var i,
            w = _fleeqPlayer.screenSize.w,
            h = _fleeqPlayer.screenSize.h;
        for (i = 1; i < _fleeqPlayer.numberOfScreens; i++) {
            $('.iPhoneScreen.guideElement.'+i+' > div , .iPhoneScreen.guideElement.'+i+' > span ').each(function(i , elm ){
                var valueLeft = parseFloat(w * i + parseFloat($(elm).css('left')));
                _fleeqPlayer._storeValues($(elm));
                $(elm).css('left', valueLeft);
                $(elm).css('display', 'none');
                $(elm).prependTo(".iPhoneScreen.guideElement.0");
            })
        }
        var baseElement = $('.iPhoneScreen.guideElement.0');
        baseElement.css('overflow','hidden');
        baseElement.css('width',w+'px');
        baseElement.css('height',h+'px');
        for (i = 1; i < _fleeqPlayer.numberOfScreens; i++) {
            $('.iPhoneScreen.guideElement.'+i).remove();

        }
        this.playerReady = true;
    },

    // helpers:
    _storeValues: function(element) {
        element.attr('original-width',  element.get(0).style.width);
        element.attr('original-height',  element.get(0).style.height);
        element.attr('original-left',  element.css('left'));
        element.attr('original-top',  element.css('top'));
        element.attr('original-opacity',  element.css('opacity'));
    },
    _setZIndexPerScreen: function(i, delay) {
        var zIndexVal = 10, j, innerArray = _fleeqPlayer.elementsOrder[i];
        for (j = 0; j < innerArray.length; j++) {
            var currElementIds =  _fleeqPlayer.expID+'_'+innerArray[j][0]+'_'+innerArray[j][1];
            $('[data-element-group-id="'+currElementIds+'"]').wait(delay).css('z-index',zIndexVal);
            zIndexVal= zIndexVal+1;
        }
    },
    _getAllItemsInScreen: function(screenId) {
        var response = Array();
        var currElementIds =  _fleeqPlayer.expID+'_'+screenId;
        $('[data-element-group-id^="'+currElementIds+'"]').each(function(){
            var tempVal = $(this).attr('data-element-group-id');
            tempVal = tempVal.substring(tempVal.lastIndexOf("_") + 1);
            response.push(tempVal)
        });
        return response;
    },
    _stripAndSplit: function (a) {
        a = a.substring(1);
        a = a.substring(0, a.length - 1);
        a = a.replace("}, {", "}:{");
        return a.split(":");
    },
    _structureToArray: function (a) {
        a = a.replace("{", "");
        a = a.replace("}", "");
        return a.split(",");
    },
    _pushBack: function(element, timing) {
        element.wait(timing).css('display','none');
    },
    _pushToFront: function(element, timing) {
        element.wait(timing).css('display','block');
    },
    _runInboundFlow: function(transitionStructure, Element, inbound, right) {
        var ti =  $('[data-element-group-id="'+Element+'"]');
        var direction_indication = 'f';
        if(!inbound) {
            direction_indication = 't';
        } else if(parseInt(transitionStructure['t']) != 1 ) {
            this._pushToFront(ti, 0);
        }
        var transitionEnd = this.transitionTiming;
        var delayVal = 0;

        var sourceX = ti.attr('original-left');
        var sourceY = ti.attr('original-top');
        var sourceH = ti.attr('original-Height');
        var sourceW = ti.attr('original-Width');

        if (typeof transitionStructure['f'] != "undefined") {
            if (typeof transitionStructure['f'][direction_indication] != "undefined") {
                var coor = transitionStructure['f'][direction_indication];
                var s_d = this._stripAndSplit(coor);
                var sourcexy = this._structureToArray(s_d[0]);
                sourceX = parseFloat(sourcexy[0])*_fleeqPlayer.factor+'px';
                sourceY = parseFloat(sourcexy[1])*_fleeqPlayer.factor+'px';

                var sourcewh = this._structureToArray(s_d[1]);
                sourceW = parseFloat(sourcewh[0] )*_fleeqPlayer.factor+'px';
                sourceH = parseFloat(sourcewh[1] )*_fleeqPlayer.factor+'px';
            }
            if (typeof transitionStructure['f']['s'] != "undefined") {
                delayVal = transitionStructure['f']['s'] * this.transitionTiming;
            }
            if (typeof transitionStructure['f']['e'] != "undefined") {
                transitionEnd = parseFloat(transitionStructure['f']['e']) * this.transitionTiming;
            }
        }
        var adjustedTransitionTiming = parseFloat(transitionEnd - delayVal);
        if(right) {
            delayVal = this.transitionTiming - transitionEnd;
        }
        var preX = sourceX;
        var preY = sourceY;
        var preH = sourceH;
        var preW = sourceW;
        var postX = ti.attr('original-left');
        var postY = ti.attr('original-top');
        var postW = ti.attr('original-width');
        var postH = ti.attr('original-height');
        var preOpacity = 0;
        var postOpacity =   ti.attr('original-opacity');
        if(inbound === right) { // XNOR
            postX = sourceX ;
            postY = sourceY ;
            postH = sourceH ;
            postW = sourceW ;
            preX = ti.attr('original-left');
            preY = ti.attr('original-top');
            preW = ti.attr('original-width');
            preH = ti.attr('original-height');
            preOpacity = ti.attr('original-opacity');
            postOpacity = 0;
        }
        switch (parseInt(transitionStructure['t'])) {
            case 3:
                ti.css('left',preX);
                ti.css('top',preY);
                ti.wait(delayVal).animate({left: postX},  {"easing": "swing","duration":adjustedTransitionTiming, "queue": false});
                ti.wait(delayVal).animate({top: postY},  {"easing": "swing","duration":adjustedTransitionTiming, "queue": false});
                if(right) {
                    if( !inbound ) {
                        this._pushToFront(ti, 0);
                    } else {
                        this._pushBack(ti, this.transitionTiming);
                    }
                } else {
                    if( !inbound ) {
                        this._pushBack(ti, this.transitionTiming);
                    } else {
                        this._pushToFront(ti,0);
                    }
                }
                break;
            case 2:
                var opacityDelay = 0;
                var opacityEnd = this.transitionTiming;
                if (typeof transitionStructure['a'] != "undefined") {
                    if (typeof transitionStructure['a']['s'] != "undefined") {
                        opacityDelay = transitionStructure['a']['s']*this.transitionTiming;
                    }

                    if (typeof transitionStructure['a']['e'] != "undefined") {
                        opacityEnd = this.transitionTiming*parseFloat(transitionStructure['a']['e']);
                    }
                }
                var adjustedOpacityTiming = parseFloat(opacityEnd - opacityDelay);
                if (right) {
                    opacityDelay = this.transitionTiming - opacityEnd;
                }
                ti.css('left', preX);
                ti.css('top', preY);
                ti.css('opacity', preOpacity);
                ti.wait(delayVal).animate({left: postX}, {"easing": "linear", "duration": adjustedTransitionTiming, "queue": false});
                ti.wait(delayVal).animate({top: postY}, {"easing": "linear", "duration": adjustedTransitionTiming, "queue": false});
                ti.wait(opacityDelay).animate({opacity: postOpacity}, {"easing": "linear", "duration": adjustedOpacityTiming, "queue": false});
                if (right) {
                    if (inbound) {
                        this._pushBack(ti, this.transitionTiming);
                    } else {
                        this._pushToFront(ti, 0);
                    }
                } else {
                    if (inbound) {
                        this._pushToFront(ti, 0);
                    } else {
                        this._pushBack(ti, this.transitionTiming);
                    }
                }
                break;
            case 1: // Switch
                if(right) {
                    if((inbound)) {
                        this._pushBack(ti, 10);
                    } else {
                        this._pushToFront(ti, 0);
                        postX = ti.attr('original-left');
                        postY = ti.attr('original-top');
                        postW = ti.attr('original-width');
                        postH = ti.attr('original-height');
                        ti.css('left',preX);
                        ti.css('top',preY);
                        ti.css('width',preW);
                        ti.css('height',preH);
                        ti.wait(delayVal).animate({left: postX},  {"easing": "linear","duration":adjustedTransitionTiming, "queue": false});
                        ti.wait(delayVal).animate({top: postY},  {"easing": "linear","duration":adjustedTransitionTiming, "queue": false});
                        ti.wait(delayVal).animate({height: postH},  {"easing": "linear","duration":adjustedTransitionTiming, "queue": false});
                        ti.wait(delayVal).animate({width: postW},  {"easing": "linear","duration":adjustedTransitionTiming, "queue": false});
                    }
                } else {
                    if((inbound)) {
                        this._pushToFront(ti, this.transitionTiming);
                        ti.css('left',ti.attr('original-left'));
                        ti.css('top',ti.attr('original-top'));
                        ti.css('width',ti.attr('original-width'));
                        ti.css('height',ti.attr('original-height'));
                    } else {
                        this._pushBack(ti, this.transitionTiming);
                        ti.css('left',preX);
                        ti.css('top',preY);
                        ti.css('width',preW);
                        ti.css('height',preH);
                        ti.wait(delayVal).animate({left: postX},  {"easing": "linear","duration":adjustedTransitionTiming, "queue": false});
                        ti.wait(delayVal).animate({top: postY},  {"easing": "linear","duration":adjustedTransitionTiming, "queue": false});
                        ti.wait(delayVal).animate({height: postH},  {"easing": "linear","duration":adjustedTransitionTiming, "queue": false});
                        ti.wait(delayVal).animate({width: postW},  {"easing": "linear","duration":adjustedTransitionTiming, "queue": false});
                    }
                }
                break;
            case 0:
                if(right) {
                    if(!inbound) {
                        this._pushToFront(ti, this.transitionTiming);
                    }
                } else {
                    if(inbound) {
                        this._pushToFront(ti,0);
                    } else {
                        this._pushBack(ti, 0);
                    }
                }
                break;
            default :
                break;
        }
    },
    _runFastLoop: function () {
        this.transitionTiming = 300;
        var screen_duration = 800;
        if (this.recordFlag) {
            this.transitionTiming = 400;
            screen_duration = 2000;
        }
        this.currTTimer = window.setTimeout(function(){
            var currTTimerAllInnerVal, i;
            for (i = 1; i < _fleeqPlayer.numberOfScreens; i++) {
                currTTimerAllInnerVal = window.setTimeout(function(){
                    if(_fleeqPlayer.currentScreen == (_fleeqPlayer.numberOfScreens - 1)) {
                        window.setTimeout(function() {
                            _fleeqPlayer.runFastLoopFlag = true;
                        }, parseInt(screen_duration + _fleeqPlayer.transitionTiming) )
                    }
                    _fleeqPlayer.moveToDirection(false);
                }, i*parseInt(screen_duration + _fleeqPlayer.transitionTiming) );
                _fleeqPlayer.currTTimerAllInner.push(currTTimerAllInnerVal);
            }
        }, 0);
    },
    moveToDirection: function(right){
        if((!right && this.currentScreen < _fleeqPlayer.numberOfScreens)
            ||
            (right && this.currentScreen > 1)) {
            // var swipe = 'next';
            if(right) {
                // swipe = 'back';
                if(this.currentScreen > 1) {
                    this.currentScreen--;
                }
            }
            var outboundElements = this._getAllItemsInScreen(this.currentScreen-1);
            var screensTOut = this.screensTransitions[this.currentScreen-1]['o'];
            var inboundElements = this._getAllItemsInScreen(this.currentScreen);
            var screensTIn = this.screensTransitions[this.currentScreen]['i'];
            var i, key, element_id;
            for(i = 0; i < inboundElements.length ; i++) {
                for (key in screensTIn) {
                    if(inboundElements[i] == key) {
                        element_id = _fleeqPlayer.expID+'_'+this.currentScreen+'_'+inboundElements[i];
                        this._runInboundFlow(screensTIn[key], element_id, true, right);
                    }
                }
            }
            for(i = 0; i < outboundElements.length ; i++) {
                for (key in screensTOut) {
                    if(outboundElements[i] == key) {
                        element_id = _fleeqPlayer.expID+'_'+(this.currentScreen-1)+'_'+outboundElements[i];
                        this._runInboundFlow(screensTOut[key], element_id, false, right);
                    }
                }
            }

            if(right){
                if(this.currentScreen > 0) {
                    this._setZIndexPerScreen(this.currentScreen - 1, 0);
                }
            }else{
                this._setZIndexPerScreen(this.currentScreen, this.transitionTiming);
                this.currentScreen++;
            }
        }
    },
    resetToScreenOne: function(val) {
        var i,
            right = this.currentScreen > val,
            diff = Math.abs(this.currentScreen - parseInt(val)),
            transitionTimingOrg = this.transitionTiming;
        this.transitionTiming = 1;
        for(i = 0 ;i < diff ; i++){
            this.moveToDirection(right);
        }
        this.transitionTiming = transitionTimingOrg;
    },
    // _runLoop: function() {
    //     if(!flagOn) {
    //         return 0;
    //     }
    //     this.currTTimer = window.setTimeout(function(){
    //         var i, currTTimerAllInnerVal;
    //         for (i = 1; i < _fleeqPlayer.numberOfScreens; i++) {
    //             currTTimerAllInnerVal = window.setTimeout(function(){
    //                 _fleeqPlayer.moveToDirection(false);
    //             }, i * parseInt(1500 + _fleeqPlayer.transitionTiming) );
    //             _fleeqPlayer.currTTimerAllInner.push(currTTimerAllInnerVal);
    //         }
    //     }, 0);
    // },
    // _stopLoop: function () {
    //     clearTimeout(_fleeqPlayer.currTTimer);
    //     var i;
    //     for(i = 0 ; i < _fleeqPlayer.currTTimerAll.length ; i++) {
    //         clearTimeout(_fleeqPlayer.currTTimerAll[i]);
    //     }
    //     for(i = 0 ; i < _fleeqPlayer.currTTimerAllInner.length ; i++) {
    //         clearTimeout(_fleeqPlayer.currTTimerAllInner[i]);
    //     }
    //     flagOn = false;
    // }
    // _restarAfterStop: function () {
    //     anime({
    //         targets: '.iPhoneScreen',
    //         opacity: 0,
    //         duration: 200,
    //         easing: 'linear',
    //         complete: function () {
    //             _fleeqPlayer.resetToScreenOne(0);
    //             _fleeqPlayer.currTTimerAll = [];
    //             _fleeqPlayer.currTTimerAllInner = [];
    //             _fleeqPlayer.currTTimer = -1;
    //             flagOn = true;
    //             _fleeqPlayer._loopMode();
    //             anime({
    //                 targets: '.iPhoneScreen',
    //                 opacity: 1,
    //                 duration: 200,
    //                 delay: 100,
    //                 easing: 'linear'
    //             });
    //
    //         }
    //     });
    // }
    // _restartModal: function() {
    //     _fleeqPlayer._stopLoop();
    //     _fleeqPlayer._restarAfterStop();
    // },
    // _loopMode: function () {
    //     var i, currTTimerAllVal,
    //         fullDuration =  _fleeqPlayer.numberOfScreens*(1500 + _fleeqPlayer.transitionTiming) + 500;
    //     if(recordFlag) {
    //         fullDuration =  _fleeqPlayer.numberOfScreens*(4500 + _fleeqPlayer.transitionTiming) + 1500;
    //     }
    //     if(_fleeqPlayer.numberOfScreens > 1) {
    //         if(!loopRepeat) {
    //             _fleeqPlayer._runFastLoop();
    //             $('#controllers').css('display','none');
    //             return 0;
    //         }
    //         _fleeqPlayer._runLoop();
    //         for (i = 1; i <= 1500; i++) {
    //             if(!flagOn) {
    //                 break;
    //             }
    //             currTTimerAllVal = setTimeout(function (x) {
    //                 return function () {
    //                     anime({
    //                         targets: '.iPhoneScreen',
    //                         opacity: 0,
    //                         duration: 200,
    //                         easing: 'linear',
    //                         complete: function () {
    //                             _fleeqPlayer.resetToScreenOne(0);
    //                             _fleeqPlayer._runLoop();
    //                             anime({
    //                                 targets: '.iPhoneScreen',
    //                                 opacity: 1,
    //                                 duration: 200,
    //                                 delay: 100,
    //                                 easing: 'linear'
    //                             });
    //                         }
    //                     });
    //                 };
    //             }(i), fullDuration * i);
    //             _fleeqPlayer.currTTimerAll.push(currTTimerAllVal);
    //         }
    //     }
    // },
};
/*
 2017 Julian Garnier
 Released under the MIT license
*/
var $jscomp={scope:{}};$jscomp.defineProperty="function"==typeof Object.defineProperties?Object.defineProperty:function(e,r,p){if(p.get||p.set)throw new TypeError("ES3 does not support getters and setters.");e!=Array.prototype&&e!=Object.prototype&&(e[r]=p.value)};$jscomp.getGlobal=function(e){return"undefined"!=typeof window&&window===e?e:"undefined"!=typeof global&&null!=global?global:e};$jscomp.global=$jscomp.getGlobal(this);$jscomp.SYMBOL_PREFIX="jscomp_symbol_";
$jscomp.initSymbol=function(){$jscomp.initSymbol=function(){};$jscomp.global.Symbol||($jscomp.global.Symbol=$jscomp.Symbol)};$jscomp.symbolCounter_=0;$jscomp.Symbol=function(e){return $jscomp.SYMBOL_PREFIX+(e||"")+$jscomp.symbolCounter_++};
$jscomp.initSymbolIterator=function(){$jscomp.initSymbol();var e=$jscomp.global.Symbol.iterator;e||(e=$jscomp.global.Symbol.iterator=$jscomp.global.Symbol("iterator"));"function"!=typeof Array.prototype[e]&&$jscomp.defineProperty(Array.prototype,e,{configurable:!0,writable:!0,value:function(){return $jscomp.arrayIterator(this)}});$jscomp.initSymbolIterator=function(){}};$jscomp.arrayIterator=function(e){var r=0;return $jscomp.iteratorPrototype(function(){return r<e.length?{done:!1,value:e[r++]}:{done:!0}})};
$jscomp.iteratorPrototype=function(e){$jscomp.initSymbolIterator();e={next:e};e[$jscomp.global.Symbol.iterator]=function(){return this};return e};$jscomp.array=$jscomp.array||{};$jscomp.iteratorFromArray=function(e,r){$jscomp.initSymbolIterator();e instanceof String&&(e+="");var p=0,m={next:function(){if(p<e.length){var u=p++;return{value:r(u,e[u]),done:!1}}m.next=function(){return{done:!0,value:void 0}};return m.next()}};m[Symbol.iterator]=function(){return m};return m};
$jscomp.polyfill=function(e,r,p,m){if(r){p=$jscomp.global;e=e.split(".");for(m=0;m<e.length-1;m++){var u=e[m];u in p||(p[u]={});p=p[u]}e=e[e.length-1];m=p[e];r=r(m);r!=m&&null!=r&&$jscomp.defineProperty(p,e,{configurable:!0,writable:!0,value:r})}};$jscomp.polyfill("Array.prototype.keys",function(e){return e?e:function(){return $jscomp.iteratorFromArray(this,function(e){return e})}},"es6-impl","es3");var $jscomp$this=this;
(function(e,r){"function"===typeof define&&define.amd?define([],r):"object"===typeof module&&module.exports?module.exports=r():e.anime=r()})(this,function(){function e(a){if(!h.col(a))try{return document.querySelectorAll(a)}catch(c){}}function r(a,c){for(var d=a.length,b=2<=arguments.length?arguments[1]:void 0,f=[],n=0;n<d;n++)if(n in a){var k=a[n];c.call(b,k,n,a)&&f.push(k)}return f}function p(a){return a.reduce(function(a,d){return a.concat(h.arr(d)?p(d):d)},[])}function m(a){if(h.arr(a))return a;
    h.str(a)&&(a=e(a)||a);return a instanceof NodeList||a instanceof HTMLCollection?[].slice.call(a):[a]}function u(a,c){return a.some(function(a){return a===c})}function C(a){var c={},d;for(d in a)c[d]=a[d];return c}function D(a,c){var d=C(a),b;for(b in a)d[b]=c.hasOwnProperty(b)?c[b]:a[b];return d}function z(a,c){var d=C(a),b;for(b in c)d[b]=h.und(a[b])?c[b]:a[b];return d}function T(a){a=a.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i,function(a,c,d,k){return c+c+d+d+k+k});var c=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(a);
    a=parseInt(c[1],16);var d=parseInt(c[2],16),c=parseInt(c[3],16);return"rgba("+a+","+d+","+c+",1)"}function U(a){function c(a,c,b){0>b&&(b+=1);1<b&&--b;return b<1/6?a+6*(c-a)*b:.5>b?c:b<2/3?a+(c-a)*(2/3-b)*6:a}var d=/hsl\((\d+),\s*([\d.]+)%,\s*([\d.]+)%\)/g.exec(a)||/hsla\((\d+),\s*([\d.]+)%,\s*([\d.]+)%,\s*([\d.]+)\)/g.exec(a);a=parseInt(d[1])/360;var b=parseInt(d[2])/100,f=parseInt(d[3])/100,d=d[4]||1;if(0==b)f=b=a=f;else{var n=.5>f?f*(1+b):f+b-f*b,k=2*f-n,f=c(k,n,a+1/3),b=c(k,n,a);a=c(k,n,a-1/3)}return"rgba("+
    255*f+","+255*b+","+255*a+","+d+")"}function y(a){if(a=/([\+\-]?[0-9#\.]+)(%|px|pt|em|rem|in|cm|mm|ex|ch|pc|vw|vh|vmin|vmax|deg|rad|turn)?$/.exec(a))return a[2]}function V(a){if(-1<a.indexOf("translate")||"perspective"===a)return"px";if(-1<a.indexOf("rotate")||-1<a.indexOf("skew"))return"deg"}function I(a,c){return h.fnc(a)?a(c.target,c.id,c.total):a}function E(a,c){if(c in a.style)return getComputedStyle(a).getPropertyValue(c.replace(/([a-z])([A-Z])/g,"$1-$2").toLowerCase())||"0"}function J(a,c){if(h.dom(a)&&
    u(W,c))return"transform";if(h.dom(a)&&(a.getAttribute(c)||h.svg(a)&&a[c]))return"attribute";if(h.dom(a)&&"transform"!==c&&E(a,c))return"css";if(null!=a[c])return"object"}function X(a,c){var d=V(c),d=-1<c.indexOf("scale")?1:0+d;a=a.style.transform;if(!a)return d;for(var b=[],f=[],n=[],k=/(\w+)\((.+?)\)/g;b=k.exec(a);)f.push(b[1]),n.push(b[2]);a=r(n,function(a,b){return f[b]===c});return a.length?a[0]:d}function K(a,c){switch(J(a,c)){case "transform":return X(a,c);case "css":return E(a,c);case "attribute":return a.getAttribute(c)}return a[c]||
    0}function L(a,c){var d=/^(\*=|\+=|-=)/.exec(a);if(!d)return a;var b=y(a)||0;c=parseFloat(c);a=parseFloat(a.replace(d[0],""));switch(d[0][0]){case "+":return c+a+b;case "-":return c-a+b;case "*":return c*a+b}}function F(a,c){return Math.sqrt(Math.pow(c.x-a.x,2)+Math.pow(c.y-a.y,2))}function M(a){a=a.points;for(var c=0,d,b=0;b<a.numberOfItems;b++){var f=a.getItem(b);0<b&&(c+=F(d,f));d=f}return c}function N(a){if(a.getTotalLength)return a.getTotalLength();switch(a.tagName.toLowerCase()){case "circle":return 2*
    Math.PI*a.getAttribute("r");case "rect":return 2*a.getAttribute("width")+2*a.getAttribute("height");case "line":return F({x:a.getAttribute("x1"),y:a.getAttribute("y1")},{x:a.getAttribute("x2"),y:a.getAttribute("y2")});case "polyline":return M(a);case "polygon":var c=a.points;return M(a)+F(c.getItem(c.numberOfItems-1),c.getItem(0))}}function Y(a,c){function d(b){b=void 0===b?0:b;return a.el.getPointAtLength(1<=c+b?c+b:0)}var b=d(),f=d(-1),n=d(1);switch(a.property){case "x":return b.x;case "y":return b.y;
    case "angle":return 180*Math.atan2(n.y-f.y,n.x-f.x)/Math.PI}}function O(a,c){var d=/-?\d*\.?\d+/g,b;b=h.pth(a)?a.totalLength:a;if(h.col(b))if(h.rgb(b)){var f=/rgb\((\d+,\s*[\d]+,\s*[\d]+)\)/g.exec(b);b=f?"rgba("+f[1]+",1)":b}else b=h.hex(b)?T(b):h.hsl(b)?U(b):void 0;else f=(f=y(b))?b.substr(0,b.length-f.length):b,b=c&&!/\s/g.test(b)?f+c:f;b+="";return{original:b,numbers:b.match(d)?b.match(d).map(Number):[0],strings:h.str(a)||c?b.split(d):[]}}function P(a){a=a?p(h.arr(a)?a.map(m):m(a)):[];return r(a,
    function(a,d,b){return b.indexOf(a)===d})}function Z(a){var c=P(a);return c.map(function(a,b){return{target:a,id:b,total:c.length}})}function aa(a,c){var d=C(c);if(h.arr(a)){var b=a.length;2!==b||h.obj(a[0])?h.fnc(c.duration)||(d.duration=c.duration/b):a={value:a}}return m(a).map(function(a,b){b=b?0:c.delay;a=h.obj(a)&&!h.pth(a)?a:{value:a};h.und(a.delay)&&(a.delay=b);return a}).map(function(a){return z(a,d)})}function ba(a,c){var d={},b;for(b in a){var f=I(a[b],c);h.arr(f)&&(f=f.map(function(a){return I(a,
    c)}),1===f.length&&(f=f[0]));d[b]=f}d.duration=parseFloat(d.duration);d.delay=parseFloat(d.delay);return d}function ca(a){return h.arr(a)?A.apply(this,a):Q[a]}function da(a,c){var d;return a.tweens.map(function(b){b=ba(b,c);var f=b.value,e=K(c.target,a.name),k=d?d.to.original:e,k=h.arr(f)?f[0]:k,w=L(h.arr(f)?f[1]:f,k),e=y(w)||y(k)||y(e);b.from=O(k,e);b.to=O(w,e);b.start=d?d.end:a.offset;b.end=b.start+b.delay+b.duration;b.easing=ca(b.easing);b.elasticity=(1E3-Math.min(Math.max(b.elasticity,1),999))/
    1E3;b.isPath=h.pth(f);b.isColor=h.col(b.from.original);b.isColor&&(b.round=1);return d=b})}function ea(a,c){return r(p(a.map(function(a){return c.map(function(b){var c=J(a.target,b.name);if(c){var d=da(b,a);b={type:c,property:b.name,animatable:a,tweens:d,duration:d[d.length-1].end,delay:d[0].delay}}else b=void 0;return b})})),function(a){return!h.und(a)})}function R(a,c,d,b){var f="delay"===a;return c.length?(f?Math.min:Math.max).apply(Math,c.map(function(b){return b[a]})):f?b.delay:d.offset+b.delay+
    b.duration}function fa(a){var c=D(ga,a),d=D(S,a),b=Z(a.targets),f=[],e=z(c,d),k;for(k in a)e.hasOwnProperty(k)||"targets"===k||f.push({name:k,offset:e.offset,tweens:aa(a[k],d)});a=ea(b,f);return z(c,{children:[],animatables:b,animations:a,duration:R("duration",a,c,d),delay:R("delay",a,c,d)})}function q(a){function c(){return window.Promise&&new Promise(function(a){return p=a})}function d(a){return g.reversed?g.duration-a:a}function b(a){for(var b=0,c={},d=g.animations,f=d.length;b<f;){var e=d[b],
    k=e.animatable,h=e.tweens,n=h.length-1,l=h[n];n&&(l=r(h,function(b){return a<b.end})[0]||l);for(var h=Math.min(Math.max(a-l.start-l.delay,0),l.duration)/l.duration,w=isNaN(h)?1:l.easing(h,l.elasticity),h=l.to.strings,p=l.round,n=[],m=void 0,m=l.to.numbers.length,t=0;t<m;t++){var x=void 0,x=l.to.numbers[t],q=l.from.numbers[t],x=l.isPath?Y(l.value,w*x):q+w*(x-q);p&&(l.isColor&&2<t||(x=Math.round(x*p)/p));n.push(x)}if(l=h.length)for(m=h[0],w=0;w<l;w++)p=h[w+1],t=n[w],isNaN(t)||(m=p?m+(t+p):m+(t+" "));
else m=n[0];ha[e.type](k.target,e.property,m,c,k.id);e.currentValue=m;b++}if(b=Object.keys(c).length)for(d=0;d<b;d++)H||(H=E(document.body,"transform")?"transform":"-webkit-transform"),g.animatables[d].target.style[H]=c[d].join(" ");g.currentTime=a;g.progress=a/g.duration*100}function f(a){if(g[a])g[a](g)}function e(){g.remaining&&!0!==g.remaining&&g.remaining--}function k(a){var k=g.duration,n=g.offset,w=n+g.delay,r=g.currentTime,x=g.reversed,q=d(a);if(g.children.length){var u=g.children,v=u.length;
    if(q>=g.currentTime)for(var G=0;G<v;G++)u[G].seek(q);else for(;v--;)u[v].seek(q)}if(q>=w||!k)g.began||(g.began=!0,f("begin")),f("run");if(q>n&&q<k)b(q);else if(q<=n&&0!==r&&(b(0),x&&e()),q>=k&&r!==k||!k)b(k),x||e();f("update");a>=k&&(g.remaining?(t=h,"alternate"===g.direction&&(g.reversed=!g.reversed)):(g.pause(),g.completed||(g.completed=!0,f("complete"),"Promise"in window&&(p(),m=c()))),l=0)}a=void 0===a?{}:a;var h,t,l=0,p=null,m=c(),g=fa(a);g.reset=function(){var a=g.direction,c=g.loop;g.currentTime=
    0;g.progress=0;g.paused=!0;g.began=!1;g.completed=!1;g.reversed="reverse"===a;g.remaining="alternate"===a&&1===c?2:c;b(0);for(a=g.children.length;a--;)g.children[a].reset()};g.tick=function(a){h=a;t||(t=h);k((l+h-t)*q.speed)};g.seek=function(a){k(d(a))};g.pause=function(){var a=v.indexOf(g);-1<a&&v.splice(a,1);g.paused=!0};g.play=function(){g.paused&&(g.paused=!1,t=0,l=d(g.currentTime),v.push(g),B||ia())};g.reverse=function(){g.reversed=!g.reversed;t=0;l=d(g.currentTime)};g.restart=function(){g.pause();
    g.reset();g.play()};g.finished=m;g.reset();g.autoplay&&g.play();return g}var ga={update:void 0,begin:void 0,run:void 0,complete:void 0,loop:1,direction:"normal",autoplay:!0,offset:0},S={duration:1E3,delay:0,easing:"easeOutElastic",elasticity:500,round:0},W="translateX translateY translateZ rotate rotateX rotateY rotateZ scale scaleX scaleY scaleZ skewX skewY perspective".split(" "),H,h={arr:function(a){return Array.isArray(a)},obj:function(a){return-1<Object.prototype.toString.call(a).indexOf("Object")},
    pth:function(a){return h.obj(a)&&a.hasOwnProperty("totalLength")},svg:function(a){return a instanceof SVGElement},dom:function(a){return a.nodeType||h.svg(a)},str:function(a){return"string"===typeof a},fnc:function(a){return"function"===typeof a},und:function(a){return"undefined"===typeof a},hex:function(a){return/(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(a)},rgb:function(a){return/^rgb/.test(a)},hsl:function(a){return/^hsl/.test(a)},col:function(a){return h.hex(a)||h.rgb(a)||h.hsl(a)}},A=function(){function a(a, d,b){return(((1-3*b+3*d)*a+(3*b-6*d))*a+3*d)*a}return function(c,d,b,f){if(0<=c&&1>=c&&0<=b&&1>=b){var e=new Float32Array(11);if(c!==d||b!==f)for(var k=0;11>k;++k)e[k]=a(.1*k,c,b);return function(k){if(c===d&&b===f)return k;if(0===k)return 0;if(1===k)return 1;for(var h=0,l=1;10!==l&&e[l]<=k;++l)h+=.1;--l;var l=h+(k-e[l])/(e[l+1]-e[l])*.1,n=3*(1-3*b+3*c)*l*l+2*(3*b-6*c)*l+3*c;if(.001<=n){for(h=0;4>h;++h){n=3*(1-3*b+3*c)*l*l+2*(3*b-6*c)*l+3*c;if(0===n)break;var m=a(l,c,b)-k,l=l-m/n}k=l}else if(0===
    n)k=l;else{var l=h,h=h+.1,g=0;do m=l+(h-l)/2,n=a(m,c,b)-k,0<n?h=m:l=m;while(1e-7<Math.abs(n)&&10>++g);k=m}return a(k,d,f)}}}}(),Q=function(){function a(a,b){return 0===a||1===a?a:-Math.pow(2,10*(a-1))*Math.sin(2*(a-1-b/(2*Math.PI)*Math.asin(1))*Math.PI/b)}var c="Quad Cubic Quart Quint Sine Expo Circ Back Elastic".split(" "),d={In:[[.55,.085,.68,.53],[.55,.055,.675,.19],[.895,.03,.685,.22],[.755,.05,.855,.06],[.47,0,.745,.715],[.95,.05,.795,.035],[.6,.04,.98,.335],[.6,-.28,.735,.045],a],Out:[[.25,
    .46,.45,.94],[.215,.61,.355,1],[.165,.84,.44,1],[.23,1,.32,1],[.39,.575,.565,1],[.19,1,.22,1],[.075,.82,.165,1],[.175,.885,.32,1.275],function(b,c){return 1-a(1-b,c)}],InOut:[[.455,.03,.515,.955],[.645,.045,.355,1],[.77,0,.175,1],[.86,0,.07,1],[.445,.05,.55,.95],[1,0,0,1],[.785,.135,.15,.86],[.68,-.55,.265,1.55],function(b,c){return.5>b?a(2*b,c)/2:1-a(-2*b+2,c)/2}]},b={linear:A(.25,.25,.75,.75)},f={},e;for(e in d)f.type=e,d[f.type].forEach(function(a){return function(d,f){b["ease"+a.type+c[f]]=h.fnc(d)?
    d:A.apply($jscomp$this,d)}}(f)),f={type:f.type};return b}(),ha={css:function(a,c,d){return a.style[c]=d},attribute:function(a,c,d){return a.setAttribute(c,d)},object:function(a,c,d){return a[c]=d},transform:function(a,c,d,b,f){b[f]||(b[f]=[]);b[f].push(c+"("+d+")")}},v=[],B=0,ia=function(){function a(){B=requestAnimationFrame(c)}function c(c){var b=v.length;if(b){for(var d=0;d<b;)v[d]&&v[d].tick(c),d++;a()}else cancelAnimationFrame(B),B=0}return a}();q.version="2.2.0";q.speed=1;q.running=v;q.remove=
    function(a){a=P(a);for(var c=v.length;c--;)for(var d=v[c],b=d.animations,f=b.length;f--;)u(a,b[f].animatable.target)&&(b.splice(f,1),b.length||d.pause())};q.getValue=K;q.path=function(a,c){var d=h.str(a)?e(a)[0]:a,b=c||100;return function(a){return{el:d,property:a,totalLength:N(d)*(b/100)}}};q.setDashoffset=function(a){var c=N(a);a.setAttribute("stroke-dasharray",c);return c};q.bezier=A;q.easings=Q;q.timeline=function(a){var c=q(a);c.pause();c.duration=0;c.add=function(d){c.children.forEach(function(a){a.began=
    !0;a.completed=!0});m(d).forEach(function(b){var d=z(b,D(S,a||{}));d.targets=d.targets||a.targets;b=c.duration;var e=d.offset;d.autoplay=!1;d.direction=c.direction;d.offset=h.und(e)?b:L(e,b);c.began=!0;c.completed=!0;c.seek(d.offset);d=q(d);d.began=!0;d.completed=!0;d.duration>b&&(c.duration=d.duration);c.children.push(d)});c.seek(0);c.reset();c.autoplay&&c.restart();return c};return c};q.random=function(a,c){return Math.floor(Math.random()*(c-a+1))+a};return q});









    (function(u,r){"function"===typeof define&&define.amd?define([],r):"object"===typeof module&&module.exports?module.exports=r():u.anime=r()})(this,function(){var u={duration:1E3,delay:0,loop:!1,autoplay:!0,direction:"normal",easing:"easeOutElastic",elasticity:400,round:!1,begin:void 0,update:void 0,complete:void 0},r="translateX translateY translateZ rotate rotateX rotateY rotateZ scale scaleX scaleY scaleZ skewX skewY".split(" "),y,f={arr:function(a){return Array.isArray(a)},obj:function(a){return-1<
            Object.prototype.toString.call(a).indexOf("Object")},svg:function(a){return a instanceof SVGElement},dom:function(a){return a.nodeType||f.svg(a)},num:function(a){return!isNaN(parseInt(a))},str:function(a){return"string"===typeof a},fnc:function(a){return"function"===typeof a},und:function(a){return"undefined"===typeof a},nul:function(a){return"null"===typeof a},hex:function(a){return/(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(a)},rgb:function(a){return/^rgb/.test(a)},hsl:function(a){return/^hsl/.test(a)},
            col:function(a){return f.hex(a)||f.rgb(a)||f.hsl(a)}},D=function(){var a={},b={Sine:function(a){return 1-Math.cos(a*Math.PI/2)},Circ:function(a){return 1-Math.sqrt(1-a*a)},Elastic:function(a,b){if(0===a||1===a)return a;var d=1-Math.min(b,998)/1E3,g=a/1-1;return-(Math.pow(2,10*g)*Math.sin(2*(g-d/(2*Math.PI)*Math.asin(1))*Math.PI/d))},Back:function(a){return a*a*(3*a-2)},Bounce:function(a){for(var b,d=4;a<((b=Math.pow(2,--d))-1)/11;);return 1/Math.pow(4,3-d)-7.5625*Math.pow((3*b-2)/22-a,2)}};["Quad",
            "Cubic","Quart","Quint","Expo"].forEach(function(a,e){b[a]=function(a){return Math.pow(a,e+2)}});Object.keys(b).forEach(function(c){var e=b[c];a["easeIn"+c]=e;a["easeOut"+c]=function(a,b){return 1-e(1-a,b)};a["easeInOut"+c]=function(a,b){return.5>a?e(2*a,b)/2:1-e(-2*a+2,b)/2};a["easeOutIn"+c]=function(a,b){return.5>a?(1-e(1-2*a,b))/2:(e(2*a-1,b)+1)/2}});a.linear=function(a){return a};return a}(),z=function(a){return f.str(a)?a:a+""},E=function(a){return a.replace(/([a-z])([A-Z])/g,"$1-$2").toLowerCase()},
        F=function(a){if(f.col(a))return!1;try{return document.querySelectorAll(a)}catch(b){return!1}},A=function(a){return a.reduce(function(a,c){return a.concat(f.arr(c)?A(c):c)},[])},t=function(a){if(f.arr(a))return a;f.str(a)&&(a=F(a)||a);return a instanceof NodeList||a instanceof HTMLCollection?[].slice.call(a):[a]},G=function(a,b){return a.some(function(a){return a===b})},R=function(a,b){var c={};a.forEach(function(a){var d=JSON.stringify(b.map(function(b){return a[b]}));c[d]=c[d]||[];c[d].push(a)});
            return Object.keys(c).map(function(a){return c[a]})},H=function(a){return a.filter(function(a,c,e){return e.indexOf(a)===c})},B=function(a){var b={},c;for(c in a)b[c]=a[c];return b},v=function(a,b){for(var c in b)a[c]=f.und(a[c])?b[c]:a[c];return a},S=function(a){a=a.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i,function(a,b,c,m){return b+b+c+c+m+m});var b=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(a);a=parseInt(b[1],16);var c=parseInt(b[2],16),b=parseInt(b[3],16);return"rgb("+a+","+c+","+b+")"},
        T=function(a){a=/hsl\((\d+),\s*([\d.]+)%,\s*([\d.]+)%\)/g.exec(a);var b=parseInt(a[1])/360,c=parseInt(a[2])/100,e=parseInt(a[3])/100;a=function(a,b,c){0>c&&(c+=1);1<c&&--c;return c<1/6?a+6*(b-a)*c:.5>c?b:c<2/3?a+(b-a)*(2/3-c)*6:a};if(0==c)c=e=b=e;else var d=.5>e?e*(1+c):e+c-e*c,g=2*e-d,c=a(g,d,b+1/3),e=a(g,d,b),b=a(g,d,b-1/3);return"rgb("+255*c+","+255*e+","+255*b+")"},p=function(a){return/([\+\-]?[0-9|auto\.]+)(%|px|pt|em|rem|in|cm|mm|ex|pc|vw|vh|deg)?/.exec(a)[2]},I=function(a,b,c){return p(b)?
            b:-1<a.indexOf("translate")?p(c)?b+p(c):b+"px":-1<a.indexOf("rotate")||-1<a.indexOf("skew")?b+"deg":b},w=function(a,b){if(b in a.style)return getComputedStyle(a).getPropertyValue(E(b))||"0"},U=function(a,b){var c=-1<b.indexOf("scale")?1:0,e=a.style.transform;if(!e)return c;for(var d=/(\w+)\((.+?)\)/g,g=[],m=[],f=[];g=d.exec(e);)m.push(g[1]),f.push(g[2]);e=f.filter(function(a,c){return m[c]===b});return e.length?e[0]:c},J=function(a,b){if(f.dom(a)&&G(r,b))return"transform";if(f.dom(a)&&(a.getAttribute(b)||
            f.svg(a)&&a[b]))return"attribute";if(f.dom(a)&&"transform"!==b&&w(a,b))return"css";if(!f.nul(a[b])&&!f.und(a[b]))return"object"},K=function(a,b){switch(J(a,b)){case "transform":return U(a,b);case "css":return w(a,b);case "attribute":return a.getAttribute(b)}return a[b]||0},L=function(a,b,c){if(f.col(b))return b=f.rgb(b)?b:f.hex(b)?S(b):f.hsl(b)?T(b):void 0,b;if(p(b))return b;a=p(a.to)?p(a.to):p(a.from);!a&&c&&(a=p(c));return a?b+a:b},M=function(a){var b=/-?\d*\.?\d+/g;return{original:a,numbers:z(a).match(b)?
            z(a).match(b).map(Number):[0],strings:z(a).split(b)}},V=function(a,b,c){return b.reduce(function(b,d,g){d=d?d:c[g-1];return b+a[g-1]+d})},W=function(a){a=a?A(f.arr(a)?a.map(t):t(a)):[];return a.map(function(a,c){return{target:a,id:c}})},N=function(a,b,c,e){"transform"===c?(c=a+"("+I(a,b.from,b.to)+")",b=a+"("+I(a,b.to)+")"):(a="css"===c?w(e,a):void 0,c=L(b,b.from,a),b=L(b,b.to,a));return{from:M(c),to:M(b)}},X=function(a,b){var c=[];a.forEach(function(e,d){var g=e.target;return b.forEach(function(b){var l=
            J(g,b.name);if(l){var q;q=b.name;var h=b.value,h=t(f.fnc(h)?h(g,d):h);q={from:1<h.length?h[0]:K(g,q),to:1<h.length?h[1]:h[0]};h=B(b);h.animatables=e;h.type=l;h.from=N(b.name,q,h.type,g).from;h.to=N(b.name,q,h.type,g).to;h.round=f.col(q.from)||h.round?1:0;h.delay=(f.fnc(h.delay)?h.delay(g,d,a.length):h.delay)/k.speed;h.duration=(f.fnc(h.duration)?h.duration(g,d,a.length):h.duration)/k.speed;c.push(h)}})});return c},Y=function(a,b){var c=X(a,b);return R(c,["name","from","to","delay","duration"]).map(function(a){var b=
            B(a[0]);b.animatables=a.map(function(a){return a.animatables});b.totalDuration=b.delay+b.duration;return b})},C=function(a,b){a.tweens.forEach(function(c){var e=c.from,d=a.duration-(c.delay+c.duration);c.from=c.to;c.to=e;b&&(c.delay=d)});a.reversed=a.reversed?!1:!0},Z=function(a){if(a.length)return Math.max.apply(Math,a.map(function(a){return a.totalDuration}))},aa=function(a){if(a.length)return Math.min.apply(Math,a.map(function(a){return a.delay}))},O=function(a){var b=[],c=[];a.tweens.forEach(function(a){if("css"===
            a.type||"transform"===a.type)b.push("css"===a.type?E(a.name):"transform"),a.animatables.forEach(function(a){c.push(a.target)})});return{properties:H(b).join(", "),elements:H(c)}},ba=function(a){var b=O(a);b.elements.forEach(function(a){a.style.willChange=b.properties})},ca=function(a){O(a).elements.forEach(function(a){a.style.removeProperty("will-change")})},da=function(a,b){var c=a.path,e=a.value*b,d=function(d){d=d||0;return c.getPointAtLength(1<b?a.value+d:e+d)},g=d(),f=d(-1),d=d(1);switch(a.name){case "translateX":return g.x;
            case "translateY":return g.y;case "rotate":return 180*Math.atan2(d.y-f.y,d.x-f.x)/Math.PI}},ea=function(a,b){var c=Math.min(Math.max(b-a.delay,0),a.duration)/a.duration,e=a.to.numbers.map(function(b,e){var f=a.from.numbers[e],l=D[a.easing](c,a.elasticity),f=a.path?da(a,l):f+l*(b-f);return f=a.round?Math.round(f*a.round)/a.round:f});return V(e,a.to.strings,a.from.strings)},P=function(a,b){var c;a.currentTime=b;a.progress=b/a.duration*100;for(var e=0;e<a.tweens.length;e++){var d=a.tweens[e];d.currentValue=
            ea(d,b);for(var f=d.currentValue,m=0;m<d.animatables.length;m++){var l=d.animatables[m],k=l.id,l=l.target,h=d.name;switch(d.type){case "css":l.style[h]=f;break;case "attribute":l.setAttribute(h,f);break;case "object":l[h]=f;break;case "transform":c||(c={}),c[k]||(c[k]=[]),c[k].push(f)}}}if(c)for(e in y||(y=(w(document.body,"transform")?"":"-webkit-")+"transform"),c)a.animatables[e].target.style[y]=c[e].join(" ")},Q=function(a){var b={};b.animatables=W(a.targets);b.settings=v(a,u);var c=b.settings,
            e=[],d;for(d in a)if(!u.hasOwnProperty(d)&&"targets"!==d){var g=f.obj(a[d])?B(a[d]):{value:a[d]};g.name=d;e.push(v(g,c))}b.properties=e;b.tweens=Y(b.animatables,b.properties);b.duration=Z(b.tweens)||a.duration;b.delay=aa(b.tweens)||a.delay;b.currentTime=0;b.progress=0;b.ended=!1;return b},n=[],x=0,fa=function(){var a=function(){x=requestAnimationFrame(b)},b=function(b){if(n.length){for(var e=0;e<n.length;e++)n[e].tick(b);a()}else cancelAnimationFrame(x),x=0};return a}(),k=function(a){var b=Q(a),c=
        {};b.tick=function(a){b.ended=!1;c.start||(c.start=a);c.current=Math.min(Math.max(c.last+a-c.start,0),b.duration);P(b,c.current);var d=b.settings;c.current>=b.delay&&(d.begin&&d.begin(b),d.begin=void 0,d.update&&d.update(b));c.current>=b.duration&&(d.loop?(c.start=a,"alternate"===d.direction&&C(b,!0),f.num(d.loop)&&d.loop--):(b.ended=!0,b.pause(),d.complete&&d.complete(b)),c.last=0)};b.seek=function(a){P(b,a/100*b.duration)};b.pause=function(){ca(b);var a=n.indexOf(b);-1<a&&n.splice(a,1)};b.play=
            function(a){b.pause();a&&(b=v(Q(v(a,b.settings)),b));c.start=0;c.last=b.ended?0:b.currentTime;a=b.settings;"reverse"===a.direction&&C(b);"alternate"!==a.direction||a.loop||(a.loop=1);ba(b);n.push(b);x||fa()};b.restart=function(){b.reversed&&C(b);b.pause();b.seek(0);b.play()};b.settings.autoplay&&b.play();return b};k.version="1.1.2";k.speed=1;k.list=n;k.remove=function(a){a=A(f.arr(a)?a.map(t):t(a));for(var b=n.length-1;0<=b;b--)for(var c=n[b],e=c.tweens,d=e.length-1;0<=d;d--)for(var g=e[d].animatables,k=g.length-1;0<=k;k--)G(a,g[k].target)&&(g.splice(k,1),g.length||e.splice(d,1),e.length||c.pause())};k.easings=D;k.getValue=K;k.path=function(a){a=f.str(a)?F(a)[0]:a;return{path:a,value:a.getTotalLength()}};k.random=function(a,b){return Math.floor(Math.random()*(b-a+1))+a};return k});



    /*! Copyright 2011, Ben Lin (http://dreamerslab.com/)
     * Licensed under the MIT License (LICENSE.txt).
     *
     * Version: 1.1.1
     *
     * Requires: jQuery 1.2.6+
     */
    ;(function($,window){var get_win_size=function(){if(window.innerWidth!=undefined)return[window.innerWidth,window.innerHeight];else{var B=document.body;var D=document.documentElement;return[Math.max(D.clientWidth,B.clientWidth),Math.max(D.clientHeight,B.clientHeight)]}};$.fn.center=function(opt){var $w=$(window);var scrollTop=$w.scrollTop();return this.each(function(){var $this=$(this);var configs=$.extend({against:"window",top:false,topPercentage:0.5,resize:true},opt);var centerize=function(){var against=configs.against;var against_w_n_h;var $against;if(against==="window")against_w_n_h=get_win_size();else if(against==="parent"){$against=$this.parent();against_w_n_h=[$against.width(),$against.height()];scrollTop=0}else{$against=$this.parents(against);against_w_n_h=[$against.width(),$against.height()];scrollTop=0}var x=(against_w_n_h[0]-$this.outerWidth())*0.5;var y=(against_w_n_h[1]-$this.outerHeight())*configs.topPercentage+scrollTop;if(configs.top)y=configs.top+scrollTop;$this.css({"left":x,"top":y})};centerize();if(configs.resize===true)$w.resize(centerize)})}})(jQuery,window);[]





    var svgForInfoOnTheRight = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30.88 30.88"><title>info_topicons</title><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><circle cx="15.44" cy="15.44" r="15.44" style="opacity:0.30000000000000004"/><g id="info" style="opacity:0.8"><path d="M16.82,11A2.12,2.12,0,0,0,19,9a1.51,1.51,0,0,0-1.62-1.58,2.08,2.08,0,0,0-2.14,2A1.46,1.46,0,0,0,16.82,11Z" style="fill:#fff"/><path d="M18.4,20.29a.45.45,0,0,0-.2,0l-.11.07h0a3.53,3.53,0,0,1-1.38.59c-.2,0-.29-.26-.08-1l1.12-4.32c.43-1.58.28-2.61-.57-2.61a10.73,10.73,0,0,0-5.09,2.48h0a.45.45,0,0,0,.29.8l.15,0,.12-.07a5.36,5.36,0,0,1,1.5-.59c.2,0,.18.26,0,.92l-1,4.11c-.6,2.32,0,2.85.88,2.85a8.56,8.56,0,0,0,4.65-2.42l.05-.06a.43.43,0,0,0,.12-.31A.45.45,0,0,0,18.4,20.29Z" style="fill:#fff"/></g></g></g></svg>';


    var popupClass = document.getElementsByClassName("ecPopup");
    var modal = false;
    var draft_mode_set = false;
    var modalContent = false;
    var modalLoader = false;
    var modalAccordion = false;
    var leftArrowDiv = false;
    var rightArrowDiv = false;
    var loopPointer = false;
    var loopPointer_cleared = false;
    var loopPointerRewind = false;
    var domain = window.location.hostname ;
    var domain_prefix_api = "https://"+domain+"/ajax/actions/webExp/";
    var hasAutoPlay, shouldRewind, shouldLoop , showArrows, showCloseButton,currKey, currType ,  curr_exp_id, diffTop;
    var targetElm = false;
    var accordionMode = false;
    var urlContent = false;
    var modalHtmlFrame = false;
    var topOvelayH = false;
    var transitionDelay = false;
    var transitionDelayFast = false;
    var timerCounteInSplash = false;

    var canTransit = true;
    var canRunGIF = true;
    var steps = [];
    var recommendations = [];
    var saved_keydown = false;
    var stepByStepModal = ''; // dark / light  / modal-light-transparent
    var stepByStepModalFontColor = 'white' // white  / Dark
    var stepByStepModalOverlay = true;
    var recommendTop = 550;
    var isIpad  = false;
    var stepByStepModalAlignment = 0;
    var stepByStepModalTextAlignment = '1';
    var CTA = '1';
    var CTA_type = false;
    var CTA_text = false;
    var CTA_action = false;
    var CTA_link_same_page = false;
    var CTA_exp = false;
    var CTA_course_index = false;

    var course_CTA = '1';
    var course_CTA_type = false;
    var course_CTA_text = false;
    var course_CTA_action = false;
    var course_CTA_link_same_page = false;
    var course_CTA_exp = false;
    var course_CTA_course_index = false;




    var Feedback = '1';
    var Branding = '1';
    var extraDiff = 0;
    var ratio = 1;
    var liveModal = false;
    var notFirstTime = false;

    var allTimeOuts = Array();
    var audioFiles = Array();
    var audioFileObjects = Array();
    var audioObjects = [];
    var currAudio = false;
    var splashOn = true;
    var postSplashOn = false;
    var pauseMode = false;
    var volumeOff = false;
    var collapseMode = false;
    var hasAction = true;
    var displayName = false;




    var animMainBar;
    var animMainBarPoint;
    var time;;
    var org_time;
    var maxW;
    var measure;
    var measure2;
    var playing;
    var bgSliderWrapper;
    var bgSliderBg;
    var bgSlider;
    var bgSliderPoint;
    var playB;
    var pauseB;
    var expandB;
    var volOnB;
    var volOffB;
    var detailsOnB;
    var detailsOffB;
    var screenTimes;// = [1300,1300,1300,1300,2000,2000, 2000, 2000];
    var screenTimesOffsets;
    //var  screenTimes = [10,10,10,10,10,10, 10];
    var direction = 'i';
    var tlOverAnimPtr = false;
    var allMute = false;
    var progressbar =false;
    var nextScreenContent = false;

    var splashAutoPlatTimer;
    var stepByStepFlow = false;
    var thirdPartyAnalytics = false;
    var thirdPartyAnalyticsDone = true;
    var thirdPartyChat = false;
    var thirdPartyChatDone = true;


    var courseArrScreens = new Array();

    // var isMobileDevice = false;




    var narration = false;
    var narration_type = false;
    var single_quote = false;
    var side_quote = false;

    var grad_A = false;
    var grad_B = false;
    var bg_C = false;
    bg_c_timeline = false;
    bg_c_text = false;
    var in_video_progress = false;

    var cached_fleeq_response = [];
    var localSeenIt;

    var howlr = false;
    var currVolume = 100;

    var sm_timer_position = false;

    var _trackingStarted = false;


    if(typeof rtl !== 'undefined');
    else
    {
        rtl = false;
    }


    if(typeof captions !== 'undefined');
    else
    {
        captions = false;
    }



    // Opera 8.0+
    var isOpera = (!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;

    // Firefox 1.0+
    var isFirefox = typeof InstallTrigger !== 'undefined';

var apiDomainURL = "https://app.fleeq.io";
if(typeof api_domain !== 'undefined'){
    apiDomainURL = api_domain;
}

    var elemBody = document.getElementsByTagName("body")[0];
    elemBody.addEventListener('close-faq', function() { killModal(); }, false);

    var isMobile = {
        Android: function() {
            return navigator.userAgent.match(/Android/i);
        },
        BlackBerry: function() {
            return navigator.userAgent.match(/BlackBerry/i);
        },
        iOS: function() {
            return navigator.userAgent.match(/iPhone|iPad|iPod/i);
        },
        Opera: function() {
            return navigator.userAgent.match(/Opera Mini/i);
        },
        Windows: function() {
            return navigator.userAgent.match(/IEMobile/i);
        },
        any: function() {
            return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
        }
    };
    var randomString = function(length) {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for(var i = 0; i < length; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    };

    function cleaningDOM() {

        $('#ec_exp').remove();
        $('#course-div').remove();



        info = [];
        steps = [];
        audioFiles = [];


        document.onkeydown = null;
    }





    var inResizing = false;
    var pointerResizingTimer = null;



    function startResize2Sec()
    {
        inResizing = true;
        $('.tl-el').remove();
    }

    function backAfter2SecResize()
    {
        // rebuild sync timeline;
        inResizing = false;

        // console.log('sdfhkg');

        buildTimeLinePoints();
    }


   


    function getHeightForBottomSection() {
        var screenS_Height = window.innerHeight;
        var screenS_Width = window.innerWidth;
        var heightBottomSection = 0;
        if (showBottomAttribute && (screenS_Width > 550) && !inFullScreenMode) {
            if (screenS_Height > 600) {
                heightBottomSection = 80;
            }

            if ((screenS_Height < 600) && (screenS_Height > 400)) {
                heightBottomSection = 80;
            }
        }


        if (inFullScreenMode)
            setTihrdPartyChatInBottomRightBar(false);

        if (heightBottomSection == 80)
            setTihrdPartyChatInBottomRightBar(true);
        else
            setTihrdPartyChatInBottomRightBar(false);


        if (realMobile || inVideoRecording || isGif)
        {
            setTihrdPartyChatInBottomRightBar(false);
            return 0;
        }



        return heightBottomSection;
    }




    function getLowerSectionHeight()
    {
        var ratioUpdate = 1;
        var screenS_Height = window.innerHeight;

        var bottomSection = getHeightForBottomSection();
        if(bottomSection > 0)
        {
            ratioUpdate = 1 - parseFloat(bottomSection/window.innerHeight)
        }

        return ratioUpdate;
    }



    function setVendor(element, property, value) {
        if(element != null)
        {
            element.style["webkit" + property] = value;
            element.style["moz" + property] = value;
            element.style["ms" + property] = value;
            element.style["o" + property] = value;
        }

    }





    var showBottomAttribute = false;
    var socialPopupStatus = false;
    var canShowShare = true;



    function setPositionForPlayPauseIndicator()
    {


        var hightToCalc = window.innerHeight;
        var bottomSectionHeight =  getHeightForBottomSection();
        if(showBottomAttribute && !inFullScreenMode)
        {
            hightToCalc = window.innerHeight - bottomSectionHeight;
        }
        var hToCalc = $('#modal-content').clientRect();
        if(parseFloat(hightToCalc/ window.innerWidth) >= 0.75)
        {
            var  ratioForFullScreenInternal = parseFloat(window.innerWidth/$('#modal-content').width());
            var marginToAddInternal =  (hightToCalc - ratioForFullScreenInternal*$('#modal-content').height())/2;
            $('.quickLightBox').css('top',  (marginToAddInternal + hToCalc.height/2 - 35)+'px')
        }
        else
            $('.quickLightBox').css('top',  (hToCalc.height/2 - 35)+'px')
    }
    

    function sizeFAQ() {
        var screenS_Height = window.innerHeight;
        var screenS_Width = window.innerWidth;


        // if (screenS_Height < 300)
        //     screenS_Height = 300;
        //
        // if (screenS_Width < 400)
        //     screenS_Width = 400;

        var faq_r = document.getElementsByClassName("faq-right")[0];
        if (typeof faq_r !== 'undefined') {
            faq_r.style.height = Math.floor(parseFloat(screenS_Height - 40)) + 'px';
        }

        var iframeE = document.getElementsByClassName("mobileMain")[0];
        var ratioForFullScreen = 1;

        var shouldResizeMainFleeq = true;


        var hightToCalc = screenS_Height;
        var bottomSectionHeight = getHeightForBottomSection();


        if (showBottomAttribute && !inFullScreenMode) {
            hightToCalc = screenS_Height - bottomSectionHeight;
        }


        $('.bottom-attribution').css('height', bottomSectionHeight + 'px');
        if (bottomSectionHeight == 0) {
            $('.displayInfoSection').css('display', 'inline-block');

            if (typeof info !== 'undefined') {
                if (typeof info['info'] !== 'undefined')
                    if (info['info']['plan_id'] == 2) {
                        $('.attribution-control').css('display', 'inline-block');
                    }
            }
        } else {
            $('.displayInfoSection').css('display', 'none');
            if (info['info']['plan_id'] == 2) {
                $('.attribution-control').css('display', 'none');
            }
        }


        var showLogoRightBottom = true;
        if (screenS_Width < 750) {
            // remove watermark
            if ($('#single-quote').css('display') == 'block') {
                showLogoRightBottom = true;
            }
        }

        if (showLogoRightBottom)
            $('.team-logo').css('display', 'block');
        else
            $('.team-logo').css('display', 'none');


        // Using the big share
        canShowShare = true;
        $('.cher-popup-wrapper.small').css('opacity', '0');
        $('.cher-popup-wrapper.small').css('z-index', '0');
        $('.cher-popup-wrapper.large').css('opacity', '0');
        $('.cher-popup-wrapper.large').css('z-index', '0');


        if ($('.quickLightBox').length > 0)
            setPositionForPlayPauseIndicator();


        if (socialPopupStatus) {


            //get minimum Hight for social popup

            // var min
            var minHight = 420;
            var shareData = info['info']['sharing_data'];
            if (!shareData['embed']) {
                minHight = minHight - 60;
            }
            if (!shareData['social']) {
                minHight = minHight - 80;
            }

            // document.querySelector('.top-right-item.share').style.setProperty('opacity', 1, 'important');
            if (realMobile) {
                $('.cher-popup-wrapper.large').css('opacity', '0');
                $('.cher-popup-wrapper.large').css('z-index', '0');
                $('.cher-popup-wrapper.small').css('opacity', '1');
                $('.cher-popup-wrapper.small').css('z-index', '1');
            } else {
                if ((screenS_Width > 600) && (screenS_Height > minHight)) {

                    $('.cher-popup-wrapper.small').css('opacity', '0');
                    $('.cher-popup-wrapper.small').css('z-index', '0');
                    $('.cher-popup-wrapper.large').css('opacity', '1');
                    $('.cher-popup-wrapper.large').css('z-index', '1');

                } else {


                    // if ((screenS_Width < 400) || (screenS_Height < minHight)) {
                    //     // canShowShare = false
                    //     // document.querySelector('.top-right-item.share').style.setProperty('opacity', 0, 'important');
                    // }
                    // else
                    {

                        $('.cher-popup-wrapper.large').css('opacity', '0');
                        $('.cher-popup-wrapper.large').css('z-index', '0');
                        $('.cher-popup-wrapper.small').css('opacity', '1');
                        $('.cher-popup-wrapper.small').css('z-index', '1');

                    }
                }
            }


            var ratioForFullScreen, marginToAdd;

            if (parseFloat(hightToCalc / screenS_Width) >= 0.75) {
                ratioForFullScreen = parseFloat(screenS_Width / $('#modal-content').width());
                marginToAdd = (hightToCalc - ratioForFullScreen * $('#modal-content').height()) / 2;
                $('.cher-popup-wrapper').css('top', (marginToAdd + 100) + 'px')
                if ($('#modal-content').height() * ratioForFullScreen < 500)
                    $('.cher-popup-wrapper').css('top', (marginToAdd + 30) + 'px')
            } else {
                ratioForFullScreen = parseFloat(screenS_Height / $('#modal-content').height());

                $('.cher-popup-wrapper').css('top', '80px')
                if ($('#modal-content').height() * ratioForFullScreen < 500)
                    $('.cher-popup-wrapper').css('top', '30px')
            }


        }


        if (parseFloat(hightToCalc / screenS_Width) < 0.75) {
            // this is the wide option
            ratioForFullScreen = parseFloat(screenS_Height / $('#modal-content').height());

            $('#modal-content').css('margin-top', '0px');
            $('.top-right-items').css('top', '10px');
            $('.bottom-vid-drawer.inFrame').css('bottom', '0px');
            $('.team-logo').css('bottom', '50px');
            $('.timeline').css('bottom', '30px');

            // if($('#modal-content').length > 1)
            setVendor(document.getElementById('modal-content'), 'TransformOrigin', 'left top');


            var x = ((screenS_Width - parseFloat(hightToCalc / screenS_Height) * ratioForFullScreen * $('#modal-content').width()) / 2) + 'px';
            $('#modal-content').css('left', x);


            // $('.content-wrapper').css('opacity','0');
            // if ($('.team-logo'))
            //     $('.team-logo').css('opacity', '0');
            setTimeout(function () {

                if (document.getElementById('modal-content') != null)
                    adjustCCHeight();
            }, 500)


        } else {


            $('#modal-content').css('left', '0px');


            setVendor(document.getElementById('modal-content'), 'TransformOrigin', 'left top');
            ratioForFullScreen = parseFloat(screenS_Width / $('#modal-content').width());
            shouldResizeMainFleeq = false;

            var marginToAdd = (hightToCalc - ratioForFullScreen * $('#modal-content').height()) / 2;
            var adjustedMarginToAdd = marginToAdd / ratioForFullScreen;

            $('#modal-content').css('margin-top', adjustedMarginToAdd * ratioForFullScreen + 'px');
            $('.top-right-items').css('top', (marginToAdd + 10) + 'px');
            $('.bottom-vid-drawer.inFrame').css('bottom', (Math.floor(marginToAdd)) + 'px');
            $('.team-logo').css('bottom', '50px');
            $('.timeline').css('bottom', (marginToAdd + 30) + 'px');


            // $('.content-wrapper').css('opacity','0');

            //if ($('.team-logo'))
            //     $('.team-logo').css('opacity', '0');

            setTimeout(function () {
                if (document.getElementById('modal-content') != null)
                    adjustCCHeight();
            }, 500);
        }


        var savedRatioForFullScreen = ratioForFullScreen;
        var actualModalSize = false;

        if (typeof iframeE != 'undefined') {


            if (shouldResizeMainFleeq) {

                ratioForFullScreen = ratioForFullScreen * getLowerSectionHeight();
                $('.modal.ec').css('height', (getLowerSectionHeight() * 100) + '%');

                setVendor(document.getElementById('modal-content'), 'Transform', 'scale(' + ratioForFullScreen + ')');
                actualModalSize = $('#modal-content').width() * ratioForFullScreen;


            } else {

                setVendor(document.getElementById('modal-content'), 'Transform', 'scale(' + ratioForFullScreen + ')');
                ratioForFullScreen = ratioForFullScreen * getLowerSectionHeight();
                $('.modal.ec').css('height', (getLowerSectionHeight() * 100) + '%');
                actualModalSize = $('#modal-content').width() * ratioForFullScreen;


            }


            // var factor = ratioForFullScreen;
            // if(ratioForFullScreen < 1)
            // {
            //     factor = (-1)*(parseFloat(1 - ratioForFullScreen))/2;
            //      $('#modal-content').css('margin-top',  (factor*screenS_Height -38)+'px');
            // }


            var captionsWidth = (parseFloat((actualModalSize - 50) / screenS_Width)) * 100;
            $('#single-quote.isMobile.isIframe').css('width', captionsWidth + '%');
            var captionsLeft = (parseFloat((screenS_Width - actualModalSize + 50) / screenS_Width)) * 50;
            $('#single-quote.isMobile.isIframe').css('left', captionsLeft + '%');

            // get max height for left steps section


            var maxHeight = $('#modal-content').height() * ratioForFullScreen - $('.bottom-vid-drawer').height();
            $('.left-steps-section').css('max-height', maxHeight + 'px');

            if (parseFloat(hightToCalc / screenS_Width) >= 0.75) {

                maxHeight = ratioForFullScreen * $('#modal-content').height() - $('.bottom-vid-drawer').height();
                if (showBottomAttribute) {
                    maxHeight =
                        parseFloat(1 / getLowerSectionHeight()) * ratioForFullScreen * $('#modal-content').height() - $('.bottom-vid-drawer').height();

                }

                $('.left-steps-section').css('max-height', maxHeight + 'px');
            }

        }

        // post screen section

        if ($('.postWrapper').length > 0) {

            var margTop = hightToCalc - $('.postWrapper').height();
            margTop = Math.floor(margTop / 2);
            $('.postWrapper').css('margin-top', margTop + 'px');
            $('.team-logo').css('display', 'none');
        }


        // show / don't show steps on timeline


        if (screenS_Width / steps.length > 85)
            $('.tl-el').css('opacity', '1');
        else
            $('.tl-el').css('opacity', '0');


        if ($('.sound-status').length > 0) {
            var leftSoundOffset = $('.sound-status').offset().left;
            $('.bar-sound-setting').css('left', leftSoundOffset + 'px');

        }


        if ($('.startPlay').length > 0) {
            var domRect = $('.preInfo.noJS').clientRect();
            var domRectB = $('.startPlay').clientRect();
            var bWidth = domRect.width;

            // if(bWidth < 80)
            //     bWidth = 80;
            //
            // if(bWidth > 140)
            bWidth = 80;

            var val = ((hightToCalc - $('.startPlay').height()) / 2);
            $('.startPlay').css('margin-top', val + 'px');


        }


        if (typeof info !== 'undefined') {
            if (info['inCourse']) {

                var leftSoundOffset = $('.top-right-item.series').offset().left;
                var rightOffset = screenS_Width - leftSoundOffset + 50;
                $('.seriesContent').css('right', rightOffset + 'px');
            }
        }

    }




    var timeoutVarForDisplayCC = false;
    var timeoutVarForDisplayBottomRightLogo = false;

    function adjustCCHeight()
    {

        var screenS_Height = window.innerHeight;
        var screenS_Width =  window.innerWidth;

        var hightToCalc = screenS_Height;
        var bottomSectionHeight =  getHeightForBottomSection();


        if(showBottomAttribute && !inFullScreenMode)
        {
            hightToCalc = screenS_Height - bottomSectionHeight;
        }

        var orientation = 'portrait';
        var ratioForFullScreen = parseFloat(screenS_Width/$('#modal-content').width());
        if(parseFloat(hightToCalc/screenS_Width) < 0.75)
        {
            ratioForFullScreen = parseFloat(hightToCalc/$('#modal-content').height());
            orientation = 'landscape'
        }



        // if($('#modal-content').length == 0)
        //     return;

        if(timeoutVarForDisplayCC)
            clearTimeout(timeoutVarForDisplayCC);

        if(timeoutVarForDisplayBottomRightLogo)
            clearTimeout(timeoutVarForDisplayBottomRightLogo);



        var offsetTop = ratioForFullScreen*$('#modal-content').height() ;

        var style = window.getComputedStyle(document.getElementById('modal-content'));
        var marginTop = style.getPropertyValue('margin-top');

        offsetTop = offsetTop+parseInt(marginTop.substring(0, marginTop.length - 2));
        offsetTop = offsetTop - $('.bottom-vid-drawer').height() ;
        var saveOffset = offsetTop = offsetTop - 10;

        offsetTop = offsetTop - $('#single-quote .content-wrapper').height() ;

        // if((orientation == 'portrait') && bottomSectionHeight > 0)
        // {
        //     offsetTop = offsetTop - 0;
        //     // debugger;
        // }

        if(noControlBar)
            offsetTop = offsetTop + 40;

        $('#single-quote.isMobile.isIframe').css('top',offsetTop+'px');





        if( $('.team-logo'))
        {
             saveOffset = saveOffset - 74;
            if(orientation == 'portrait')
            {
                if(bottomSectionHeight > 0)
                {
                    saveOffset = saveOffset +40;
                    if(noControlBar)
                        saveOffset = saveOffset + 40;
                }
                else
                {
                    saveOffset = saveOffset+40;
                    if(noControlBar)
                        saveOffset = saveOffset + 40 ;
                }
            }


            if(orientation == 'landscape')
            {

                saveOffset = saveOffset+40;
                if(noControlBar)
                {
                    saveOffset = saveOffset+40;
                }

            }


            if(isGif)
            {
                 saveOffset = saveOffset -80;
            }
            else
            {
                saveOffset = saveOffset -40;
            }

            if(hideFullOverPost)
            {
                 saveOffset = saveOffset -40;
            }



            $('.team-logo').css('top',saveOffset+'px');

            timeoutVarForDisplayBottomRightLogo = setTimeout(function(){
                $('.team-logo').css('opacity','1');
            }, 500)
        }


        var domRectForFont = $('.overlayIframe').clientRect();
        var floatFontSize =  parseFloat(parseInt(domRectForFont.width)/52);
        if(floatFontSize < 12   )
            floatFontSize = 12;

        $('.content-wrapper .content').css('font-size',floatFontSize+'px');
        $('.content-wrapper .content').css('line-height',(floatFontSize*1.1)+'px');

        if(floatFontSize > 18)
            $('.content-wrapper .content').css('line-height',(floatFontSize*1.5)+'px');

        timeoutVarForDisplayCC = setTimeout(function(){
            $('.content-wrapper').css('opacity','1');
        }, 50)

    }


    function  backgroundGradient(sel, height)
    {

        var h = $( window ).height();

        var offset = $('#main-content').offset().top;
        var modalHeight = 524;
        startP = offset + parseFloat(0.69*modalHeight);
        secondP = offset + parseFloat(1*modalHeight);




        var from =  parseFloat(startP/h*100)+'%';//  '59%';
        var to = parseFloat(secondP/h*100)+'%' ;//'75%';


       var valGrad = '240, 240, 240';

        sel.css({'background' :     'rgb('+valGrad+')' });
        sel.css({ 'background' : '-moz-linear-gradient(top, rgba( '+valGrad+' ,1) '+from+' , rgba(255,255,255,1) '+to+' )' });
        sel.css({ 'background' : 'webkit-linear-gradient(top, rgba( '+valGrad+' ,1) '+from+' ,rgba(255,255,255,1) '+to+' )' });
        sel.css({ 'background' : 'linear-gradient(to bottom, rgba( '+valGrad+' ,1) '+from+' ,rgba(255,255,255,1) '+to+' )' });
        sel.css({ 'filter' : 'progid:DXImageTransform.Microsoft.gradient( startColorstr="#e3e3e3", endColorstr="#ffffff",GradientType=0 )' });
    }


    window.onresize = function(event) {
        sizeFAQ();
    };



    function quickLightBoxIndication(typeOfInfo)
    {


        var SVGtoShow = '<svg  xmlns="http://www.w3.org/2000/svg" ' +
            'xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 13.33 15.11"  style="    ' +
            'width: 50px;" class="play b_svg">' +
            '<defs><linearGradient id="New_Gradient_Swatch_copy_play_overlay" y1="7.56" x2="13.33" y2="7.56" gradientUnits="userSpaceOnUse">' +
            '<stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#000"/>' +
            '</linearGradient></defs><title>play</title><g id="Layer_2" data-name="Layer 2">' +
            '<g id="Layer_1-2" data-name="Layer 1">' +
            '<path d="M12.87,6.76,1.37.12A.92.92,0,0,0,0,.92V14.19A.92.92,0,0,0,1.37,15l11.5-6.64A.92.92,0,0,0,12.87,6.76Z" ' +
            'style="fill:url(#New_Gradient_Swatch_copy_play_overlay)"/></g></g></svg>';

        if(typeOfInfo == 'pause')
            SVGtoShow = '<svg   xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' +
                        'viewBox="0 0 10.3 15.14" style="width: 40px;"  class="pause b_svg">' +
                        '<defs><linearGradient id="New_Gradient_Swatch_copy_pause_overlay" x1="4.4" y1="11.79" x2="12.9" y2="3.35" gradientUnits="userSpaceOnUse">' +
                        '<stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#000"/>' +
                        '</linearGradient><linearGradient id="New_Gradient_Swatch_copy_pause_overlay-2" x1="-2.6" y1="11.79" x2="5.9" y2="3.35" xlink:href="#New_Gradient_Swatch_copy_pause_overlay"/></defs>' +
                        '<title>pause</title><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1">' +
                         '<path d="M8.65,15.14c-.91,0-1.65-.46-1.65-1V1c0-.57.74-1,1.65-1S10.3.46,10.3,1V14.11C10.3,14.68,9.56,15.14,8.65,15.14Z" style="fill:url(#New_Gradient_Swatch_copy_pause_overlay)"/>' +
                         '<path d="M1.65,15.14c-.91,0-1.65-.46-1.65-1V1C0,.46.74,0,1.65,0S3.3.46,3.3,1V14.11C3.3,14.68,2.56,15.14,1.65,15.14Z" style="fill:url(#New_Gradient_Swatch_copy_pause_overlay-2)"/></g></g></svg>';


        var htmlLightBox = '<div class="quickLightBox" type = "'+typeOfInfo+'" >'+SVGtoShow+'</div>';



        $('.quickLightBox').remove();
        $('body').append(htmlLightBox);
        setPositionForPlayPauseIndicator();


        $('.quickLightBox').fadeIn('slow', function(){

            $('.quickLightBox').fadeOut('slow', function(){
                 $('.quickLightBox').remove();
            })
        })

    }



    function getOffsetForNarrationSeek()
    {
        var currScreen = _fleeqPlayer.currentScreen;
        currScreen = currScreen-1;
        if(currScreen == 0)
        {
            return 0;
        }
        else
        {
            var duration_counter = 0;
            for(var i =0 ; i < currScreen ; i++)
            {
                duration_counter = duration_counter +parseInt(steps[i]['duration']) + 600
            }
            var offset = parseFloat(duration_counter/1000);
            return parseFloat(offset);
        }
    }

    var canMovePlayPause = true;


    function semaphorePlayPause()
    {
        if(isMobileDevice && !isInIframe)
        {
            if(!canMovePlayPause)
                return false;

            canMovePlayPause = false;
            var to = setTimeout(function(){canMovePlayPause = true; }, 700 );
            return true;
        }
        else
        {
            return true;
        }

    }




    var dontClearStep = false;

    function playPauseToggle()
    {
        if(!pauseMode)
            moveToPause(false);
        else
            moveToPlay(false);
    }


    function fleeqPause(){
        moveToPause(true);
    }

    let eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
    let eventer = window[eventMethod];
    let messageEvent = eventMethod === "attachEvent" ? "onmessage" : "message";
    // Listen to message from child window
    eventer(messageEvent,function(e) {
        if(e.origin === full_domain_link.replace(/\/$/, "")
            && e.data === 'pause-fleeq'){
            fleeqPause();
        }
    },false);

    function moveToPause(indication)
    {


        if(inVideoRecording)
            indication = false;


        if(indication)
            quickLightBoxIndication('pause');
        $('#playButtonInControls').attr('visibility', '');
        $('#pauseButtonInControls').attr('visibility', 'hidden');
        if(tlOverAnimPtr)
        tlOverAnimPtr.pause();
        // tlOverAnimPtr.seek(parseFloat((tlOverAnimPtr.currentTime - 200)/time*100));


        // if(!howlr)

        fullNarrationFile.pause();
        // soundManager.fadeTo('fullAudioFile',50,0, function(){
        //     fullNarrationFile.pause();
        // });

        // else
        //     fullNarrationFile.pause();

        pauseMode = true;
        _stopAllVideos();
        return;





    }

    function syncAudioToTimeLine(allowAudioMargin)
    {
        // sync audio to timeline


        if(!howlr) {
            if(!allowAudioMargin){
                fullNarrationFile.setPosition(tlOverAnimPtr.currentTime);
                //console.log("synced");
            }else{
                //console.log("skipped");
            }
        } else {
            fullNarrationFile.seek(parseFloat(tlOverAnimPtr.currentTime/1000));
        }





    }



    function moveToPlay(flag)
    {

        if(inVideoRecording)
            flag = false;


         if(!splashOn && flag)
            quickLightBoxIndication('play');
        inPauseBeforeBlur = false;
        $('#playButtonInControls').attr('visibility', 'hidden');
        $('#pauseButtonInControls').attr('visibility', '');




        syncAudioToTimeLine();
        if(tlOverAnimPtr)
            tlOverAnimPtr.play();





            fullNarrationFile.play();

        pauseMode = false;





    }



    var NarrationVolumeOff = false;

    function moveToVolumeOff()
    {


        // $('.volume.on.svg_b').attr('visibility', 'hidden');
        // $('.volume.off.svg_b').attr('visibility', 'visible');


        // if(currAudio)
        // {
        //     //currAudio.volume = 0;
        //
        //
        //     // currAudio.muted = true;
        //     currAudio.mute(true);
        //
        // }

        // if(fullNarrationFile)
        // {
        //     fullNarrationFile.fade(1.0,0.0, 000);
        //     NarrationVolumeOff = true;
        // }
        // volumeOff = true;

    }




    $(document).on('click', '.bar-sound-setting .inner-bar-full-bg', function (e) {


        var diff = e.pageY - $('.inner-bar-full-bg').offset().top;
        var newVol = parseFloat((65-diff)/65);
        setVolume(parseFloat(newVol));
        $('.inner-bar-full-top').css('top',diff+'px');
        setVolumeVisualBar(diff);

    })



    $(document).on('click', '.bar-sound-setting .inner-bar-full', function (e) {


        var diff = e.pageY - $('.inner-bar-full-bg').offset().top;
        var newVol = parseFloat((65-diff)/65);
        setVolume(parseFloat(newVol));
        $('.inner-bar-full-top').css('top',diff+'px');
        setVolumeVisualBar(diff);


    })



    function clickOnTheLiveBarVolume()
    {

    }


    function clickOnVolume()
    {


            if(currVolume == 0)
            {
                setVolume(1.0);
                setVolumeVisualBar(0);
                $('.inner-bar-full-top').css('top','0px');
            }
            else
            {
                setVolume(0.0);
                setVolumeVisualBar(65);
                $('.inner-bar-full-top').css('top','65px');
            }







    }



    function setVolume(newValVol)
    {


            currVolume = newValVol*100;


            if(!howlr)
                fullNarrationFile.setVolume(currVolume);
            else
                fullNarrationFile.volume(newValVol);



            if(newValVol == 0)
                NarrationVolumeOff = true;
            else
                NarrationVolumeOff = false;



            if(newValVol <0.1)
            {

                $('.bottom-vid-drawer.isMobile.inFrame .sound-status .changeVolume').html(muteButtonSvg);
            }
            if( (newValVol >=0.1) && (newValVol < 0.3))
            {
                $('.bottom-vid-drawer.isMobile.inFrame .sound-status .changeVolume').html(volumeButtonSvg_3);
            }
            if( (newValVol >=0.3) && (newValVol < 0.7))
            {
                $('.bottom-vid-drawer.isMobile.inFrame .sound-status .changeVolume').html(volumeButtonSvg_2);
            }
            if( (newValVol >=0.7) && (newValVol <= 1))
            {
                $('.bottom-vid-drawer.isMobile.inFrame .sound-status .changeVolume').html(volumeButtonSvg);
            }
    }

    function moveToVolumeOn()
    {

        // if(narration == '0')
        // {
        //
        //     if($('.noNarration').css('display') == 'none')
        //     {
        //         $('.noNarration').fadeIn('fast', function(){
        //             setTimeout(function(){
        //                 $('.noNarration').fadeOut('slow');
        //             }, 1500)
        //         });
        //     }
        //
        //     return 0;
        // }



        // $('.volume.on.svg_b').attr('visibility', 'visible');
        // $('.volume.off.svg_b').attr('visibility', 'hidden');

        // if(currAudio)
        // {
        //     if(!pauseMode)
        //     {
        //         // currAudio.volume = 1.0;
        //         // currAudio.muted = false;
        //
        //         currAudio.volume(1.0);
        //         currAudio.mute(false);
        //     }
        //
        // }

        // if(fullNarrationFile)
        // {
        //     fullNarrationFile.fade(0.0,1.0, 000);
        //     NarrationVolumeOff = false;
        // }
        //
        //
        //
        // volumeOff = false;
    }




    function ifEmbedWindowName()
    {
        var flag = false;
        if((window.mam == "inlineSoloBig") || (window.mam == "inlineSoloBigNoCTA") || (window.mam == "inlineSoloMini") || (window.mam == "inlineSolo")
            ||(window.mam == "wide"));
            flag = true;


         return flag;

    }



    function restartGuide()
    {

        $('.timeClock').css('opacity',1);

        if(!autoReplay)
            toggleTimeLinePlayer();
        clearGIFopacityForScreen(1);


        if(($('.fullOverPost').length > 0 ) || autoReplay)
        {
            volumeOff = false;
            changeLocationOnTimeline(0, true);
            //changeLocationOnTimeline(0, false);
                $('.fullOverPost').fadeOut('fast', function () {
                    $('.fullOverPost').remove();
                    canTransit = true;
                    document.onkeydown = saved_keydown;
                })
            return 0;
        }


        setTimeout(function(){
            var obj = {};
            obj.content = 'loaded'

            parent.postMessage(obj,"*");
        }, 10);


        if((info['product']['player_type'] == 1) && !(info['in_course']))
        {
            setTimeout(function(){ $('#undelineShadow').css('opacity', '1').hide().fadeIn('fast'); }    , 300);
        }

        if(info['in_course'])
        {

            clearInterval(nextScreencounterCD);
                $('#courses_link').fadeIn('slow');

            if($('#leftScreenCourseInfo').length > 0)
            {

                // we have an auto play on the right side

                if((info['product']['player_type'] == 1) || (info['product']['player_type'] == 3))
                {
                    // the middle player

                    $('#leftScreenCourseInfo').fadeOut('fast', function(){
                        if($('#main-content').hasClass('movedLeft'))
                        {
                            anime({
                                targets: '#main-content',
                                translateX: '0px',
                                duration: 550,
                                easing: 'linear',
                                complete: function () {
                                    $('#main-content').removeClass('movedLeft');
                                }
                            });
                        }
                    });

                    if(info['product']['player_type'] == 1)
                    {
                        setTimeout(function(){ $('#undelineShadow').css('opacity', '1').hide().fadeIn('fast'); }    , 700);
                    }


                }
                else
                {
                    $('#leftScreenCourseInfo').fadeOut('fast');

                }
            }

        }

        postSplashOn = false;
        var defaultDuration = 1700
        var edgeOffset = 10
        var myDiv = document.querySelector(".accordion.arrows")
        var myScroller = zenscroll.createScroller(myDiv, defaultDuration, edgeOffset);
        myScroller.toY(0);


        //document.querySelector('.timeline').style.display = 'block';







        if((info['product']['player_type'] == 2) || (info['product']['player_type'] == 4) || (info['product']['player_type'] == 1) )
        {
            anime({
                targets: '#main-content',
                opacity: '0',
                duration: 250,
                easing: 'linear',
                complete: function () {


                    if((info['product']['player_type'] == 4) || isMobileDevice)
                    {
                        // var rightDiv = '<div id="single-quote">' +
                        //     '<div class="title"></div>' +
                        //     '<div class="left-circle-highlight"></div>' +
                        //     '<div id="runningbg"></div>' +
                        //     '<div class="content"></div>' +
                        //     '</div>';
                        //
                        //
                        // $('#main-content').append(rightDiv);

                        $('#single-quote').css('opacity', '1');
                        // $('#main-content').css('min-width', '1180px');
                    }
                    else if(info['product']['player_type'] == 2)
                    {

                            $('.desk.accordion').css('display','inline-block');
                            $('.desk.accordion').css('margin-left','0px');
                        // $('#main-content').css('min-width', '1180px');
                        $('#main-content').css('min-width', (ratio*1024 + 490)+'px');

                    }
                    else
                    {
                            $('#single-quote.bottom').css('opacity', '1');
                            $('#single-quote.bottom').css('background-color', bg_C);
                        $('#single-quote.bottom > .content').css('color', bg_c_text);
                            $('#undelineShadow').css('top', '499px');


                    }

                    $('#main-content').css({"-webkit-transform":"translateX(0px)"});



                    jumpToScreen(0, true);
                    //$('#single-quote').css('opacity', '1');
                    anime({
                        targets: '#main-content',
                        opacity: '1',
                        delay: 200,
                        duration: 250,
                        easing: 'linear',
                        complete: function () {


                        }
                    })

                }
            })




        }
        else
        {
            jumpToScreen(0, true);
        }




        if($('.white-layer').length > 0)
        {
            setTimeout(function(){
                $('.white-layer').fadeOut(200, function() {
                    $('.white-layer').remove();
                });
            }, 250);
        }


        var delay = 200;
        var duration = 350;
        if(isMobileDevice)
        {
            delay = 0;
            duration = 250;
            if(!isInIframe)
            {

            }
        }

        anime({
            targets: '.postInfo',
            opacity: '0',
            delay: delay,
            duration: duration,
            easing: 'linear',
            complete: function(){

                document.querySelector('.postInfo').innerHTML = '';
                document.onkeydown =  saved_keydown;
                //moveToWide();
                if((info['product']['player_type'] == 2))
                {
                    //$('.desk.accordion.arrows').css('left', '500px');
                    $('.desk.accordion.arrows').css('opacity', '1');
                }

                if(isMobileDevice)
                {
                    $('#runningbg').css({'display':'block'});
                    $('.sound-status.isMobile').fadeIn('fast');


                    $('#single-quote').fadeIn('fast', function(){
                        $('#single-quote').css('opacity', '1');
                    });
                    $('#main-content iframe').fadeIn('fast');

                    //$('#single-quote.isMobile').css({'width' : mobileScreenWidth+'px' });
                    readDeviceOrientation();
                    //if(isInIframe)
                    //{
                    //
                    //    $('.bottom-vid-drawer.isMobile.inFrame').css({'top' : mobileScreenHeight*0.75+'px'});
                    //}

                }


            }
        })

        anime({
            targets: '.timeline',
            opacity: 1,
            duration: 350,
            easing: 'linear'
        });


        anime({
            targets: '.bottom-vid-drawer',
            opacity: 1,
            delay: delay,
            duration: duration,
            easing: 'linear'
        });




        if(isMobileDevice && !isInIframe)
        {

            currAudio.src  = audioFiles[0];
            currAudio.load();
            currAudio.onloadeddata  = function(){

                currAudio.play(); // mobile
                // console.log('abouToPlay');
            } ;

        }
        else
        {
            playSectionAudio();
        }


    }


    function get_clean_hostname(url) {
        var m = url.match(/^https:\/\/[^/]+/);
        if(m == null){
            m = url.match(/^http:\/\/[^/]+/);
        }
        return m ? m[0] : null;
    }






    function viewAction()
    {
        var webExpType = 'guide';
        var idVal = info['meta']['web_exp_id'];
        updateAnalytics(idVal, webExpType , 'view', false);
        if(info['inCourse'])
        {
            var webExpType = 'course';
            var idVal = info['course_id'];
            if(info['is_first_in_course'])
            {
                updateAnalytics(idVal, webExpType , 'view', false);
            }
        }
    }




    function feedbackAction(action)
    {
        var webExpType = 'guide';
        var idVal = info['meta']['web_exp_id'];
        if(info['inCourse'])
        {
            var webExpType = 'course';
            var idVal = info['course_id'];
        }

        updateAnalytics(idVal, webExpType , 'feedback', action);
        switchFeedbackBox();
    }



    function switchFeedbackBox()
    {


        $('.thumbs-container').fadeOut('fast' ,function(){

            $('.feedback_feedback').fadeIn('fast');
        } );




        // anime({
        //     targets: '.thumbs-container',
        //     opacity: 0,
        //     duration: 250,
        //     easing: 'linear',
        //     complete: function(){
        //
        //
        //         document.querySelector('.feedback_feedback').style.display = 'block';
        //         anime({
        //             targets: '.feedback_feedback',
        //             opacity: 1,
        //             duration: 250,
        //             easing: 'linear',
        //             complete: function(){
        //
        //
        //             }
        //         });
        //
        //     }
        // });
    }


    function clearCourseStoryLine()
    {
        if($('.horizontal.coursetimeline .steps .step').length > 0)
        {
            $('.horizontal.coursetimeline .steps .step').removeClass('active');
            $('.horizontal.coursetimeline .steps .step .over-flow-progress').css('width','0px');
            $('.horizontal.coursetimeline .steps .step .over-flow-progress-prefix').css('width','0px');
            $('.horizontal.coursetimeline .steps .step.active .over-flow-progress').css('width','0px');
            $('.horizontal.coursetimeline .steps .step.active .over-flow-progress-prefix').css('width','0px');
        }
    }

    function runNextGuide(type, nextIndex)
    {


        clearCourseStoryLine();

        if((info['product']['player_type'] == 2) || (info['product']['player_type'] == 4))
        {
            if($('#main-content').hasClass('movedLeft'))
            {
                anime({
                    targets: '#main-content',
                    translateX: '0px',
                    duration: 50,
                    easing: 'linear',
                    complete: function () {
                        $('#main-content').removeClass('movedLeft');
                    }
                });
            }
        }



        liveModal = false;
        // if(currAudio.duration > 0)
        // {
        //     currAudio.muted = true;
        // }

        // if(currAudio.seek() > 0)
        // {
        //     currAudio.mute(true);
        // }




        notFirstTime = true;
        clearTimeout(loopPointer);
        clearTimeout(loopPointerRewind);
        var elem = document.getElementById("main-content");
        if(elem)
        {
            while (elem.hasChildNodes()) {
                elem.removeChild(elem.lastChild);
            }

        }
        var elem = document.getElementById("course-div");
        if(elem)
        {
            while (elem.hasChildNodes()) {
                elem.removeChild(elem.lastChild);
            }
            elem.parentNode.removeChild(elem);
        }
        elem = document.getElementById("turnDeviceNotification");
        if(elem)
        {
            while (elem.hasChildNodes()) {
                elem.removeChild(elem.lastChild);
            }
            elem.parentNode.removeChild(elem);
        }
        document.onkeydown = simple_keydown;
        removeAllTimeOuts();
        muteAudio();
        splashOn = true;
        allMute = false;
        pauseMode = false;
        postSplashOn = false;
        didFrameLoad = false;
        fullAudioFileLoaded = false;

        if(narration == '0')
        {
            fullAudioFileLoaded = true;
        }

        loaded = 0;
        invideo = false;

        setTimeout(function(){
            modalLoader.style.display = "block";
            $('.loader-2').hide().fadeIn('slow');
        }, 300 ) ;
        //document.onkeydown = null;

        if( ((info['product']['player_type'] == 1) || (info['product']['player_type'] == 3)) && (info['in_course']) )
        {

            if($('#main-content').hasClass('movedLeft'))
            {
                anime({
                    targets: '#main-content',
                    translateX: '0px',
                    duration: 50,
                    easing: 'linear',
                    complete: function () {
                        $('#main-content').removeClass('movedLeft');
                    }
                });
            }

        }






        if(typeof cached_fleeq_response[type] !== 'undefined')
        {
            curr_code_key  = type;
            assignAndLoadPopup(cached_fleeq_response[type]);
        }
        else
        {
            getData(type , 'step-by-step', nextIndex , false );
        }


    }





    function shouldLaunchCourseInEmbed()
    {
        if((window.name == 'inlineSoloBig') || (window.name == 'inlineSolo') )
        {
            return true;
        }
        return false;
    }


    function runAction()
    {










        if( (CTA_type == 'exp') || ( CTA_type == 'course') )
        {
            //elm = document.getElementsByClassName('startAction')[0];
            //var keyVal = elm.getAttribute('ec-key');
            //var typeVal = elm.getAttribute('ec-type');


            var ext = '';
            if(shouldTrack)
            {
               if(CTA_type == 'course')
               {
                   if(shouldLaunchCourseInEmbed())
                   {
                       ext = '?mtype=c';
                       window.location = 'https://'+window.location.host+'/l/'+CTA_exp+ext;
                   }
                   else
                   {
                       if(isMobileDevice)
                       {
                           window.open('https://'+window.location.host+'/l/'+CTA_exp+ext);
                       }
                       else
                       {
                           window.location = 'https://'+window.location.host+'/l/'+CTA_exp+ext;
                       }

                   }
               }
               else
               {
                   window.location = 'https://'+window.location.host+'/l/'+CTA_exp+ext;

               }
            }
            else
            {
                if(CTA_type == 'course')
                {
                    if(shouldLaunchCourseInEmbed())
                    {
                        ext = '?mtype=c';
                        window.location = 'https://'+window.location.host+'/l/'+CTA_exp+ext;
                    }
                    else
                    {
                        if(isMobileDevice)
                        {
                            window.open('https://'+window.location.host+'/l/'+CTA_exp+ext);
                        }
                        else
                        {
                            window.location = 'https://'+window.location.host+'/l/'+CTA_exp+ext;
                        }
                    }

                }
                else
                {

                    window.location = 'https://'+window.location.host+'/l/'+CTA_exp;

                }
            }

            return 0;






            if($('.fullOverPost').length > 0)
            {
                $('.bottom-vid-drawer').fadeOut('fast', function(){
                    $('.bottom-vid-drawer').remove();
                });
                $('.timeline').fadeOut('fast', function(){
                    $('.timeline').remove();
                });
                $('.fullOverPost').fadeOut('fast', function(){
                    $('.fullOverPost').remove();
                    runNextGuide(CTA_exp, CTA_course_index);
                })
            }
            else
            {
                runNextGuide(CTA_exp, CTA_course_index);
            }



        }


        if(CTA_type == 'link')
        {
            if(CTA_link_same_page == '0')
            {
                var win = window.open(CTA_action, '_blank');
                win.focus();
            }
            else
            {
                window.open(CTA_action, '_top');
                //window.location = CTA_action;
            }
        }
        else
        {

        }
    }


    $(document).on('click', '.landing-page-logo', function (ev) {
        window.open('https://www.fleeq.io');

    })

    $(document).on('click', '.replayCourse', function (ev) {
        $('#mainPostCourse').fadeOut('fast', function(){


            if($('#main-content').css('display') != 'table')
            {
                $('#main-content').css('display', 'table');
            }
            runNextGuideInCourse(curr_code_key, 0);
            $('#main-content').css('opacity', '1.0');
            $('#mainPostCourse').remove();





        })

    });



    function addPostCourseScreen()
    {


        if($('.bottom-vid-drawer').length > 0)
        {
            $('.bottom-vid-drawer').fadeOut('fast', function(){
                $('.bottom-vid-drawer').remove();
            })


        }


        extraClass = '';
        extraClassCta = '';

        if(course_CTA == '0')
        {
            extraClass = 'middleCourseReplay';
            extraClassCta = 'hide';
        }

        var replayAction = '<div class="startRePlayCourse '+extraClass+'" >' +
                                '<div id="svgReplay"> ' +
                                    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 81 81">' +
                                    '<defs>' +
                                        '<style>.cls-1-replay{fill:url(#Gradient_Swatch_replay);}</style>' +
                                            '<linearGradient id="Gradient_Swatch_replay" y1="39.5" x2="79" y2="39.5" gradientUnits="userSpaceOnUse">' +
                                                '<stop offset="0" stop-color="'+grad_A+'"/>' +
                                                '<stop offset="1" stop-color="'+grad_B+'"/>' +
                                            '</linearGradient>' +
                                        '</defs>' +
                                        '<title>Replay</title>' +
                                        '<g id="Layer_2" data-name="Layer 2">' +
                                            '<g id="Layer_1-2" data-name="Layer 1">' +
                                                '<g id="refresh">' +
                                                    '<g id="_760-refresh-3_2x.png" data-name="760-refresh-3@2x.png">' +
                                                        '<path class="cls-1-replay" d="M77.59,38.09a1.41,1.41,0,0,0-1.41,1.41A36.76,36.76,0,1,1,72,22.58H55a1.41,1.41,0,1,0,0,2.81H74.77A1.41,1.41,0,0,0,76.17,24V4.23a1.41,1.41,0,1,0-2.81,0v15A39.41,39.41,0,1,0,79,39.5h0A1.41,1.41,0,0,0,77.59,38.09Z"/>' +
                                                   '</g>' +
                                                '</g>' +
                                            '</g>' +
                                        '</g>' +
                                    '</svg>' +
                                '</div>' +
            '<a href="#" class="replayCourse" style="color: #666;">Replay this course</a></div>';




        var actionDiv = '<div class="startAction '+extraClassCta+'"  id="ctaPostCourse">' +
                            '<div id="svgAction">' +
                                '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 91.66 53.46">' +
                                    '<defs>' +
                                      '<style>.cls-1-arrow{fill:url(#New_Gradient_Swatch_arrow);}</style>' +
                                        '<linearGradient id="New_Gradient_Swatch_arrow" y1="26.73" x2="91.66" y2="26.73" gradientUnits="userSpaceOnUse">' +
                                            '<stop offset="0" stop-color="'+grad_A+'"/>' +
                                            '<stop offset="1" stop-color="'+grad_B+'"/>' +
                                        '</linearGradient>' +
                                    '</defs>' +
                                    '<title>'+course_CTA_text+'</title>' +
                                    '<g id="Layer_2" data-name="Layer 2">' +
                                        '<g id="Layer_1-2" data-name="Layer 1">' +
                                            '<path class="cls-1-arrow" d="M91.23,25.66l0,0L66,.44a1.5,1.5,0,0,0-2.12,2.12L86.54,25.23H0v3H86.54L63.87,50.9A1.5,1.5,0,1,0,66,53L91.2,27.81l0,0a1.51,1.51,0,0,0,0-2.13Z"/>' +
                                        '</g>' +
                                    '</g>' +
                                '</svg>'+
                            '</div> ' +
                            '<a href="#" style="color: #666;"><span>'+course_CTA_text+'</span></a></div>';



        var extraCss = '';
        if(isInIframe)
        {
            extraCss = 'inIframe';
        }

        var screenPost ="<div id='mainPostCourse' style='opacity: 0;' class='"+extraCss+"'>" +
                            "<div class='title1'>Congratulations!</div>" +
                            "<div class='title2' style='color: "+grad_A+"'>You have finished this series</div>" +
                            "<div class='leftReplay'>"+replayAction+"</div>" +
                            "<div class='rightAction'>"+actionDiv+"</div>" +
                            "<div class='feedbackText'>Was this course helpful?</div>" +
                            "<div class='thumbsUpLeft'><a class='clickUp'>Up</a></div>" +
                            "<div class='thumbsDownRight'><a class='clickDown'>Down</a></div>" +
                         "</div>"



        return screenPost;


    }



    var creatingPost = false;



    function getNextInCourse()
    {


        var indexVal = 0;
        for(var i = 0 ; i < info['all_fleeqs_in_course'].length ; i++)
        {
            if(info['all_fleeqs_in_course'][i]['code_key'] == curr_code_key)
            {

                if( i == (info['all_fleeqs_in_course'].length - 1) )
                {
                    // lats one
                    indexVal = false;
                }
                else
                {
                    indexVal = i+1;
                }
            }
        }

        return indexVal;


    }



    function prePostScreenSeries()
    {

        anime({
            targets: '#main-content',
            opacity: '0',
            duration: 250,
            easing: 'linear',
            complete: function () {
                info['next_fleeq_in_course'] = info['all_fleeqs_in_course'][0]['code_key'];
                info['in_course_index'] = 0;
                addPostScreen();


            }
        })



    }



    $(document).on('click', '.nextFleeq .closing-remove', function (ev) {
        $('.nextFleeq').fadeOut(200);
        clearInterval(timerPtrForNextFleeq);
    });


    $(document).on('click', '.nextFleeq .main-row', function (ev) {
        var codeKeyInSeries =  $('.nextFleeq').data('fleeq-entry');
        var toURL = full_domain_link+'l/'+codeKeyInSeries+'?ap=1';
        const additionalParams = _getURLAdditionalParams();
        if(additionalParams.length > 0) {
            toURL += '&'+additionalParams;
        }
        window.location = toURL;
    });


 /// building the timer for the playlist mode

    var timerPtrForNextFleeq = false;
    function timerMode()
    {

        if( $('.nextFleeq .remaining-time').length > 0)
        {

            var myString = $('.nextFleeq .remaining-time').html();
            var val = parseInt(myString.slice(-2));
            val = val - 1;
            $('.nextFleeq .remaining-time').html('0:0'+val);
            if(val == 0)
            {
                var codeKeyInSeries =  $('.nextFleeq').data('fleeq-entry');
                var toURL = full_domain_link+'l/'+codeKeyInSeries+'?ap=1';
                const additionalParams = _getURLAdditionalParams();
                if(additionalParams.length > 0) {
                    toURL += '&'+additionalParams;
                }
                window.location = toURL;
            }
            if(val < 0)
            {
                clearInterval(timerPtrForNextFleeq)
                $('.nextFleeq .remaining-time').html('Redirecting...');
            }
        }
    }


    // startTimer();


    function startTimer()
    {

        timerPtrForNextFleeq  = setInterval(timerMode, 1000);

    }





    function createAnIframeOverlay()
    {



        var ctaRtlClass = '';
        if(info['header_rtl'] == 1)
        {
            ctaRtlClass = 'rtl';

        }

        var relevantAction = '';
        if ((isMobileDevice && !isInIframe) && !info['in_course'])
        {
            relevantAction  = 'mobileNext(true)';
        }
        else
        {
            relevantAction  = 'restartGuide()';
        }



        if(isMobileDevice && !isInIframe && info['inCourse'])
        {


            relevantAction  = 'prePostScreenSeries()';
        }

        document.onkeydown = simple_keydown;
        var headlineCode = '<div class="startRePlay " onclick="'+relevantAction+'" >' +
            '<a  class="replayContainerText">' +
            '<div id="svgReplay"> ' +
            '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 81 81">' +
            '<defs>' +
            '<style>.cls-1-replay{fill:url(#Gradient_Swatch_replay);}</style>' +
            '<linearGradient id="Gradient_Swatch_replay" y1="39.5" x2="79" y2="39.5" gradientUnits="userSpaceOnUse">' +
            '<stop offset="0" stop-color="#ffffff"/>' +
            '<stop offset="1" stop-color="#ffffff"/>' +
            '</linearGradient>' +
            '</defs>' +
            '<title>Replay</title>' +
            '<g id="Layer_2" data-name="Layer 2">' +
            '<g id="Layer_1-2" data-name="Layer 1">' +
            '<g id="refresh">' +
            '<g id="_760-refresh-3_2x.png" data-name="760-refresh-3@2x.png">' +
            '<path class="cls-1-replay" d="M77.59,38.09a1.41,1.41,0,0,0-1.41,1.41A36.76,36.76,0,1,1,72,22.58H55a1.41,1.41,0,1,0,0,2.81H74.77A1.41,1.41,0,0,0,76.17,24V4.23a1.41,1.41,0,1,0-2.81,0v15A39.41,39.41,0,1,0,79,39.5h0A1.41,1.41,0,0,0,77.59,38.09Z"/>' +
            '</g>' +
            '</g>' +
            '</g>' +
            '</g>' +
            '</div>' +
            '</a></div>';




        var thumbsEnableClass = '';
        if(info['feedback_enabled'] == 0)
        {
            thumbsEnableClass = 'hide';
        }

        var thumbs = '<div class="thumbs-container '+thumbsEnableClass+'">' +
                        '<span class="title-for-thumbs '+ctaRtlClass+'  ">'+info['feedback_pre_text']+'</span>' +
                        '<div class="thumbs-up-div"><a href="#" onclick="feedbackAction(1)">' +
                        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21.69 24.68"><title>thumbs up </title><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><g id="thumbs_down" data-name="thumbs down"><g id="_778-thumbs-down-selected_2x.png" data-name="778-thumbs-down-selected@2x.png"><path d="M21.69,14.35A3.48,3.48,0,0,1,21,16.66,2.72,2.72,0,0,1,21.66,18c.18.88-.36,1.74-1.12,2.81.1.37.63.92.18,1.78-.75,1.44-3.31,2.1-7,2.1-4.53,0-6.37-.35-8-1a12.88,12.88,0,0,0-5.3-.78h0a.43.43,0,0,1-.4-.44V13.67H0a.43.43,0,0,1,.42-.43h0c1.23,0,1.83-.24,2.35-1.25A12.64,12.64,0,0,1,5.09,8.71C8.39,5.23,9.38,4,9.38,1.84A1.62,1.62,0,0,1,11,0c1.26,0,2.56,1.34,2.56,3.58a9.06,9.06,0,0,1-1.28,4.14c-.35.66-.72,1.33-.59,1.6,0,.08.21.29,1,.42a9.41,9.41,0,0,0,3.52-.36,5.11,5.11,0,0,1,3.63,0,2.08,2.08,0,0,1,.67,2.46A2.69,2.69,0,0,1,21.69,14.35Z" style="fill:#ffffff"/></g></g></g></g></svg>' +
                        '</div>' +
                        '<div class="thumbs-down-div"><a href="#" onclick="feedbackAction(0)">' +
                        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21.69 24.68"><title>thumbs down</title><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><g id="thumbs_down" data-name="thumbs down"><g id="_778-thumbs-down-selected_2x.png" data-name="778-thumbs-down-selected@2x.png"><path d="M21.69,10.33A3.48,3.48,0,0,0,21,8a2.72,2.72,0,0,0,.63-1.33c.18-.88-.36-1.74-1.12-2.81.1-.37.63-.92.18-1.78C20,.67,17.4,0,13.66,0,9.13,0,7.3.35,5.7,1a12.88,12.88,0,0,1-5.3.78h0A.43.43,0,0,0,0,2.2V11H0a.43.43,0,0,0,.42.43h0c1.23,0,1.83.24,2.35,1.25A12.64,12.64,0,0,0,5.09,16c3.29,3.48,4.29,4.72,4.29,6.87A1.62,1.62,0,0,0,11,24.68c1.26,0,2.56-1.34,2.56-3.58A9.06,9.06,0,0,0,12.25,17c-.35-.66-.72-1.33-.59-1.6,0-.08.21-.29,1-.42a9.41,9.41,0,0,1,3.52.36,5.11,5.11,0,0,0,3.63,0,2.08,2.08,0,0,0,.67-2.46A2.69,2.69,0,0,0,21.69,10.33Z" style="fill:#ffffff"/></g></g></g></g></svg>' +
                        '</div>' +
                        '</div>';



        var replayGuideContainer  = "<div class='replayContainer'></div>";

         var CTAdiv  = "";


        var fullOverlay = '<div class="fullOverPost" style="display: none;"></div>';
        if(!isMobileDevice)
        {
            fullOverlay = '<div class="fullOverPost fullScreen" style="display: none;"></div>';
        }
        $('#ec_exp').append(fullOverlay);


        if(inVidRecording)
        {


            $('.fullOverPost').fadeIn(150, function(){

            });

        }
        else
        {
            $('.fullOverPost').fadeIn(450, function(){
                // if(window.name == 'inlineSolo')
                {
                    var wrapperForPostSection = "<div class='postWrapper'></div>";
                    $('.fullOverPost').append(wrapperForPostSection);
                    if($('.replayContainer').length < 1)
                    {
                        $('.postWrapper').append(replayGuideContainer);
                        $('.replayContainer').fadeIn('fast', function(){
                            $('.replayContainer').append(headlineCode);
                            $('#svgReplay').css('width','100px');
                            $('#svgReplay svg').css('width','45px');
                            $('.replayContainerText').css('color', '#ffffff');
                        })
                    }
                    if($('.series-item.current').length > 0 )
                    {
                        if($('.series-item.current + .series-item').length > 0 )
                        {
                            var nextInline = $('.series-item.current + .series-item').data('fleeq-entry');
                            var nextInlineName = $('.series-item.current + .series-item').find('.series-item-name').html();
                            var nextInlineTime = $('.series-item.current + .series-item').find('.series-item-time').html();

                            var nextFleeqInLine = '<div class="nextFleeq" data-fleeq-entry="'+nextInline+'">' +
                                                        '<div class="top-section">' +
                                                            '<span>Coming up</span>' +
                                                            '<span class="remaining-time">0:10</span>' +
                                                            '<span class="closing-remove">x</span>' +
                                                        '</div>'+
                                                        '<div class="main-row">' +
                                                            '<img class="nextFleeqImage" ' +
                                                            'src="https://s3-eu-west-1.amazonaws.com/guidez-thumbnails/'+
                                                             info["env"]+'/'+nextInline+
                                                            '_thumbnail.jpg"> ' +
                                                            '<div class="main-right-name"><span>'+nextInlineName+'</span></div>'+
                                                        '</div>'+
                                                  '</div>';
                            $('.fullOverPost').append(nextFleeqInLine);
                        }
                    }
                    if(CTA == '1') {
                        CTAdiv  = "<span class='ctadiv "+ctaRtlClass+"   startAction' onclick='runAction()' > </span>";
                        $('.postWrapper').prepend(CTAdiv);
                        $('.ctadiv').css('margin', ' 35px auto 10px auto');
                        $('.ctadiv').css('background-color', grad_A);
                        $('.ctadiv').css('background-color', 'transparent');
                        $('.ctadiv').css('color', grad_A);
                        $('.ctadiv').html(CTA_text);
                        $('.ctadiv').css('border-color', grad_A);
                    }
                    if($('.thumbs-container').length < 1)
                    {
                        $('.postWrapper').append(thumbs);
                        var c_html =
                            '<div class="feedback_feedback '+ctaRtlClass+'" style="color:#ffffff">'
                            +info["feedback_post_text"]+
                            '</div>';
                        $('.postWrapper').append(c_html);
                    }
                }
                sizeFAQ();
                startTimer();
            });
        }
        w = mobileScreenWidth;
        leftpos = mobileScreenWidth - 65;
        var exstyle = 'left: 340px; top:100px;' ;
    }


    function stopVideoFlagAndUpdate(fullScreen)
    {
        in_video_progress = false;
        var obj = {};
        obj.content = curr_code_key
        obj.fullScreen = fullScreen;
        if((typeof  list !== 'undefined') && list)
        {
            obj.inCourse = true;
        }
        else
        {
            obj.inCourse = false;
        }

        parent.postMessage(obj,"*");

    }



    function postMessageRestartGuide(fullScreen)
    {
        var obj = {};
        obj.content = 'restart'
        obj.fullScreen = fullScreen;

        parent.postMessage(obj,"*");

    }


    var inPostScreenState = false;


    var inVideoRecording = false;
    if(typeof hideFullOverPost !== 'undefined')
    {
        if(hideFullOverPost)
        {
            inVideoRecording = true;
        }
    }



    function toggleTimeLinePlayer()
    {


        if($('.bottom-vid-drawer').css('display') == 'none')
        {
            $('.team-logo').css('display','block');
            $('.timeline').css('display','block');
            $('.bottom-vid-drawer').css('display','block');
        }
        else
        {
            $('.team-logo').css('display','none');
            $('.timeline').css('display','none');
            $('.bottom-vid-drawer').css('display','none');
        }



    }



    function  addPostScreen()
    {




        if(autoReplay)
        {
            restartGuide();
            return 0;
        }

        $('.timeClock').css('opacity',0);

        if(inVideoRecording)
            return 0;


        if(inPostScreenState)
        {
            return 0;
        }
        inPostScreenState = true;
        setTimeout(function(){ inPostScreenState = false; }, 500)


        toggleTimeLinePlayer();
        dontClearStep = true;

        if(!inVideoRecording)
        {
            if($('.fullOverPost').length<1)
                createAnIframeOverlay();
        }
        else
        {
            var fullOverlay = '<div class="fullOverPost" style="display: none;"></div>';
            if($('.fullOverPost').length<1)
            $('#ec_exp').append(fullOverlay);
        }


        return 0;



    }










    function getNextGuideInCourse()
    {
             var curr_web_exp_id = info['meta']['web_exp_id'];
            for ( var i = 0 ; i < info['course_data'].length ; i++ )
                {
                    if(info['course_data'][i]['web_exp_id'] == curr_web_exp_id )
                    {
                     return  i;
                    }
                }
    }






    var nextScreenCountCD;
    var nextScreencounterCD;

    function timerCountdownFoNextScreen()
    {
        if (nextScreenCountCD < 2)
        {
            $('#clckToNextGudie').click();

            clearInterval(nextScreencounterCD);
            //counter ended, do something here
            return;
        }
        nextScreenCountCD = nextScreenCountCD-1;
        if($('#nextGuideTimer').length > 0)
        document.querySelector('#nextGuideTimer').innerHTML = nextScreenCountCD;
        //Do code for showing the number of seconds here
    }


    function runNxtGuideInCourse(nextIndex)
    {


        $("#single-quote").remove();
        runNextGuide(curr_code_key, nextIndex);
        clearInterval(nextScreencounterCD);


    }

    function stopScreenCounter(){
        clearInterval(nextScreencounterCD);
    }

    //$(document).on('click', '.stopNextStepTimer', function (ev) {
    //    clearInterval(nextScreencounterCD);
    //});



    function setLeftCourseScreen()
    {

        var wrapper= document.createElement('div');
        wrapper.innerHTML= '<div id="leftScreenCourseInfo" style="display: inline-block !important;"></div>';
        var divNew = wrapper.firstChild;
        var mainBG = document.getElementById('main-content');
        mainBG.insertBefore(divNew , mainBG.childNodes[1]);

        var currGuideInLine = getNextGuideInCourse();
        if(info['course_data'].length > currGuideInLine) {

            var nextGuideInLine = parseInt(currGuideInLine + 1);
            //console.log(nextCourseInLine);
            var innerCourseInfo = "" +
                "<h5 class='topline'>About the <bold>series</bold></h5>" +
                "<h2 class='courseHeader'>" + info['course_meta']['display_name'] + "</h2>" +
                "<h4 class='courseDesc'>" + info['course_meta']['description'] + "</h4>" +
                "<h2 id='nextTitle'>Coming up next</h2>" +
                "<p id='nextDisplayNameTitle'>\"" + info['course_data'][nextGuideInLine]['display_name'] + "\"</p><br>" +
                "<a id='clckToNextGudie' onclick='runNxtGuideInCourse(" + nextGuideInLine + ")'>" +
                "Starts in <span id='nextGuideTimer'>5 </span> seconds" +
                "</a><span id='stopSection' onclick='stopScreenCounter()'><span> | </span> <span class='stopNextStepTimer'> stop</span></span>" +
                "<div id='screenShotOfNextGuide'>" + nextScreenContent + "</div>"+
                "<div class='atributionLogo'><span>Powered by:</span><img src='/assets/images/attributionLogo.png'></div>" ;
            $('#leftScreenCourseInfo').append(innerCourseInfo);
            //$('#leftScreenCourseInfo').fadeIn('slow');
            $('#leftScreenCourseInfo').fadeIn('fast', function () {
                nextScreenCountCD = 5;
                nextScreencounterCD = setInterval(timerCountdownFoNextScreen, 1000); //1000 will  run it every 1 second
                allTimeOuts.push(nextScreencounterCD);
            });
        }
    }



    function nextCourseScreenInMobile()
    {

        var currGuideInLine = getNextGuideInCourse();
        if(info['course_data'].length > currGuideInLine) {

            var nextGuideInLine = parseInt(currGuideInLine + 1);
            //console.log(nextCourseInLine);
            var innerCourseInfo = "" +

                "<div class='autoStartsMobile'><a id='clckToNextGudie' onclick='runNxtGuideInCourse(" + nextGuideInLine + ")'>" +
                "Starts in <span id='nextGuideTimer'>5 </span> seconds" +
                "</a><span id='stopSection' onclick='stopScreenCounter()'><span> | </span> <span class='stopNextStepTimer'> stop</span></span></div>";
                //"<div class='atributionLogo'><span>Powered by:</span><img src='/assets/images/attributionLogo.png'></div>" ;


                nextScreenCountCD = 5;
                nextScreencounterCD = setInterval(timerCountdownFoNextScreen, 1000); //1000 will  run it every 1 second
                allTimeOuts.push(nextScreencounterCD);


            return innerCourseInfo;

        }
        else
        {
            return false;
        }
    }





    function mouseOverAddTimeLine ( )  {


        anime({
            targets: '.timeline',
            opacity: '1',
            duration: 150,
            easing: 'linear',
            complete: function(){

            }
        })

    }

    function mouseOutRemoveTimeLine ( )  {
        anime({
            targets: '.timeline',
            opacity: '0',
            duration: 150,
            easing: 'linear',
            complete: function(){

            }
        })
    }


    function addBottomShadow()
    {

        var extraTopCss = '';
        if (info['product']['player_type'] == 1)
        {
             //extraTopCss = 'extraOnTop';

        }


        //var undelineShadow = '<svg id="undelineShadow"   class="'+extraTopCss+'" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 777.55 25.6"><defs><style>.cls-1-bdrawer{opacity:0.1;filter:url(#AI_GaussianBlur_7);}</style><filter id="AI_GaussianBlur_7" name="AI_GaussianBlur_7"><feGaussianBlur stdDeviation="7"/></filter></defs><title>Asset 43</title><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><g class="cls-1-bdrawer"><rect width="777.55" height="25.6" rx="11.02" ry="11.02"/></g></g></g></svg>';




        extraTopCss = '';
        if(isMobileDevice)
        {
            extraTopCss = 'hide'
        }



        // var undelineShadow = '<img id="undelineShadow"   class="'+extraTopCss+'" src="/assets/images/underlineShadow.png" >';
        //
        //
        //
        // var wrapper= document.createElement('div');
        // wrapper.innerHTML= undelineShadow;
        // var divNew = wrapper.firstChild;
        // var mainBG = document.getElementById('main-content');
        // mainBG.insertBefore(divNew , mainBG.childNodes[2]);





        if(!isMobileDevice)
        {
            var stepsCounter = 'One step';
            if(info['steps'].length > 1)
            {
                stepsCounter = info['steps'].length+' steps';
            }


            var undelineContent = '<div id="undelineContent"   class="" src="" >' +
                '<div class="belowGuide nameOfGuide">'+displayName+'</div>' +
                '<div class="belowGuide numOfSteps pull-right"><img src="/assets/images/Guide/steps.png">'+stepsCounter+'</div>' +
                '<div class="belowGuide guideDuration pull-right"><img src="/assets/images/Guide/duration.png">'+msToTime(info['info']['guide_duration'])+'</div>' +
                '</div>';




            // $('#main-content').append(undelineContent);
        }




            $('#undelineShadow').hide().fadeIn('slow');
    }


    function hexToRgb(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }


    function setTimeLineColors() {


        var baseColor = info['product']['player_grad_a'];
        var baseColorWithOpacity = 'rgba( '+hexToRgb(info['product']['player_grad_a']).r+' , '+hexToRgb(info['product']['player_grad_a']).g+' , '+hexToRgb(info['product']['player_grad_a']).b+' , 0.5 )';

        baseColorWithOpacity = bg_c_timeline;


        $('.tl').each(function () {
            $(this).css('background-color', baseColorWithOpacity);
            // this.style.setProperty('background-color', baseColorWithOpacity, 'important');
        });

        $('.tl-el-point').each(function () {
            $(this).css('background-color', baseColor);
            // $(this).css('background-color', 'transparent');
            // this.style.setProperty('background-color', baseColorWithOpacity, 'important');
        });

        $('.tl-el-point.in-tl').each(function () {
            $(this).css('background-color', baseColor);
            // this.style.setProperty('background-color', baseColor, 'important');
        });

        $('.tl-over, .tl-over-prefix').each(function () {
            $(this).css('background-color', baseColor);
            // this.style.setProperty('background-color', baseColor, 'important');
        });

    }


    // $(el).bind('webkitfullscreenchange mozfullscreenchange fullscreenchange', function(e) {
    //     var state = document.fullScreen || document.mozFullScreen || document.webkitIsFullScreen;
    //     var event = state ? 'FullscreenOn' : 'FullscreenOff';
    //
    //     // Now do something interesting
    //     alert('Event: ' + event);
    // });



    function restorePostFullScreen()
    {

        inFullScreenMode = false;
        $('.allFullScreenDiv a ').html(allowFullScreen);
        sizeFAQ();

        $('.blackCurtain').fadeIn(0, function(){

            $('.blackCurtain').fadeOut(300, function(){
            });
        })
    }

    var inFullScreenMode= false;

    function launchIntoFullscreen(element) {


        if(inFullScreenMode)
        {
            // exit full-screen



            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }



            inFullScreenMode = false;
            $('.allFullScreenDiv a ').html(allowFullScreen);






        }
        else

        {



            inFullScreenMode = true;


            $('.blackCurtain').fadeIn(0, function(){

                var ratioForFullScreen = parseFloat((screen.height-38)/window.innerHeight);


                if(element.requestFullscreen) {
                    element.requestFullscreen();
                } else if(element.mozRequestFullScreen) {
                    element.mozRequestFullScreen();
                } else if(element.webkitRequestFullscreen) {
                    element.webkitRequestFullscreen();
                } else if(element.msRequestFullscreen) {
                    element.msRequestFullscreen();
                }

                $('#single-quote').css('opacity','0');



                // setVendor(document.getElementById('modal-content'), 'Transform', 'scale('+ratioForFullScreen+')');
                $('#modal-content').css('display', 'block');

                $('.allFullScreenDiv a ').html(allowFullScreenMinimize);
                $('.blackCurtain').fadeOut(300, function(){
                    $('#single-quote').css('opacity','1');
                });

            })


        }




    }




    document.addEventListener("fullscreenchange", function () {
        // console.log('Event: '+document.fullScreenEnabled);

        if(document.fullscreenElement == null)
        {
            restorePostFullScreen()
        }
    }, false);

    document.addEventListener("mozfullscreenchange", function () {
        // console.log('Event: '+document.fullScreenEnabled);

        if(document.mozFullScreenElement == null)
        {
            restorePostFullScreen()
        }
    }, false);

    document.addEventListener("webkitfullscreenchange", function () {
        // console.log('Event: '+document.webkitFullscreenElement);
        if(document.webkitFullscreenElement == null)
        {
            restorePostFullScreen()
        }

    }, false);

    document.addEventListener("msfullscreenchange", function () {
        console.log('Event: '+document.fullScreenEnabled);
    }, false);



    $(document).on("click", ".share-close-button", function() {
        $('.cher-popup-wrapper').css('z-index','0');
        socialPopupStatus = false;
        // sizeFAQ();
    })



    function clearSuffixForSharedLink()
    {
        // $('.box-for-time-in').data('status', 'off');
        // $('.url-value').html(full_domain_link+'l/'+curr_code_key);
        // $('.box-for-time-in').html('<div class="wrapper-v"></div>');
    }


    function launchSharePopup()
    {

        if(!canShowShare)
            return;



        // $('.cher-popup-wrapper').css('z-index','1')
        if(!pauseMode)
            moveToPause(true);



        if(currTimeInSeconds() == 0)
        {
            $('.url-share-specific-infleeq-spot').css('display','none');
        }
        else
        {
            $('.url-share-specific-infleeq-spot').css('display','inline-block');
            $('.current-time-value span').html(toClockTimer(currTimeInSeconds()));
        }

        socialPopupStatus = true;
        sizeFAQ();

        var shareData = info['info']['sharing_data'];
        if(!shareData['embed'])
        {
            $('.embed-share').css('display','none');
        }

        if(!shareData['social'])
        {
            $('.cocial-share').css('display','none');
        }





    }

    function toggleInSpecificTime()
    {


        // if($('.box-for-time-in').data('status') == 'off')
        // {
        //     $('.box-for-time-in').data('status', 'on');
        //     $('.url-value').html(full_domain_link+'l/'+curr_code_key+'?t='+Math.floor(currTimeInSeconds()));
        //     $('.box-for-time-in').html('<div class="wrapper-v">'+vSignInSpecificTime+'</div>');
        // }
        // else
        // {
        //     clearSuffixForSharedLink();
        // }



    }


    function getCurrentURLtoShare()
    {


        var response = info['meta']['shareLink']+'?ra='+randomString(6);
        if($('.box-for-time-in').data('status') == 'on')
        {
            response = info['meta']['shareLink']+'?t='+currTimeInSeconds()+'&ap=1&ra='+randomString(6);
        }
        return response;


    }



    function getLiveThumbnailToShare()
    {

        var thumbURL = 'https://s3-eu-west-1.amazonaws.com/guidez-thumbnails/'+
                                                             info["env"]+'/'+info["thumbnailCode"]+
                                                            '_600.jpg';

        return thumbURL;
    }




    function goToAttributionReferal()
    {
        moveToPause(false);
        var win = window.open(info['info']['referral_url']);
        win.focus();
    }

    function pauseAndOpenFullScreen()
    {
        //var mainModal = document.getElementsByClassName("ec")[0];
        //launchIntoFullscreen(mainModal)
        launchIntoFullscreen($("body")[0]);

        return;
    }




    function toggleCurrentCaptionsInLanguages()
    {
        if($('.cap-item.current').data('type') == 'on')
        {
            $('.cap-item.current').removeClass('current');
            $('.cap-item[data-type="off"]').addClass('current');
            $('#single-quote').addClass('noCC');

        }
        else
        {
            $('.cap-item.current').removeClass('current');
            $('.cap-item[data-type="on"]').addClass('current');
            $('#single-quote').removeClass('noCC');
        }
    }


    $(document).on('click', '.cap-item', function (e) {


        if($(this).hasClass('current'))
            return 0;


        toggleCaptionsB();


    });



    function  toggleCaptionsB() {



        var ccState = false;

        if ($('.cc-control').length > 0) {
            if ($('.cc-control').hasClass('noCC')) {
                $('.cc-control').removeClass('noCC');
                ccState = true;

            }
            else {
                $('.cc-control').addClass('noCC');
                $('#single-quote').addClass('noCC');
            }
        }


        if ($('.cap-item').length > 0) {
            if ($('.cap-item.current').data('type') == 'on') {
                $('.cap-item.current').removeClass('current');
                $('.cap-item[data-type="off"]').addClass('current');
            }
            else {
                $('.cap-item.current').removeClass('current');
                $('.cap-item[data-type="on"]').addClass('current');
                ccState = true;
            }
        }


        if(ccState)
        {
            $('#single-quote').removeClass('noCC');
        }
        else
        {
            $('#single-quote').addClass('noCC');
        }


        $('#single-quote').css('opacity',0);
        sizeFAQ();
        setTimeout(function(){$('#single-quote').css('opacity',1);},500);

    }



    // var timerForPopupRemovalIndie = false;
    //
    // $(document).on('mouseover', '.top-right-item.indie .displayInfoSection , .top-right-item.indie .indicator-right ', function (e) {
    //
    //     if( $('.seriesContent').css('display') != 'none')
    //             $('.seriesContent').css('display','none')
    //     $('.top-right-item.indie .displayInfoSection').css('display','block');
    //     clearTimeout(timerForPopupRemovalIndie);
    // });
    //
    //
    // $(document).on('mouseleave', '.top-right-item.indie .displayInfoSection , .top-right-item.indie .indicator-right', function () {
    //     timerForPopupRemovalIndie = setTimeout(function(){
    //         $('.top-right-item.indie .displayInfoSection').css('display','none');
    //     }, 200);
    //
    // });









    var timerForPopupRemoval = false;

    $(document).on('mouseover', '.series-control , .seriesContent', function (e) {


        if( $('.top-right-item.indie .displayInfoSection ').css('display') != 'none')
            $('.top-right-item.indie .displayInfoSection ').css('display','none')

        $('.seriesContent').css('display','inline-block');
        clearTimeout(timerForPopupRemoval);
    });


    $(document).on('mouseleave', '.series-control , .seriesContent', function () {
        timerForPopupRemoval = setTimeout(function(){
            $('.seriesContent').css('display','none');
        }, 200);

    });





    var timerForPopupRemovalLeftStep = false;

    $(document).on('mouseover', '.steps-control , .left-steps-section', function (e) {

        $('.left-steps-section').css('display','block');
        clearTimeout(timerForPopupRemovalLeftStep);
    });


    $(document).on('mouseleave', '.steps-control , .left-steps-section', function () {
        timerForPopupRemovalLeftStep = setTimeout(function(){
            $('.left-steps-section').css('display','none');
        }, 200);

    });




    // var timerForPopupOfBottomLowerRightLogo = false;
    // $(document).on('mouseover', '.logo-follow img.brand-image , .logo-follow .content-for-logo-follow', function (e) {
    //
    //     $('.logo-follow .content-for-logo-follow').css('display','block');
    //     clearTimeout(timerForPopupOfBottomLowerRightLogo);
    // });
    // $(document).on('mouseleave', '.logo-follow img.brand-image , .logo-follow .content-for-logo-follow ', function () {
    //     timerForPopupOfBottomLowerRightLogo = setTimeout(function(){
    //         $('.logo-follow .content-for-logo-follow').css('display','none');
    //     }, 200);
    //
    // });







    var timerForPopupRemovalForLanguageCC = false;
    $(document).on('mouseover', '.language-control , .tooltipController', function (e) {
        if(realMobile)
            return

        $('.tooltipController').css('display','inline-block');
        clearTimeout(timerForPopupRemovalForLanguageCC);
    });
    $(document).on('mouseleave', '.language-control , .tooltipController', function () {
        if(realMobile)
            return

        timerForPopupRemovalForLanguageCC = setTimeout(function(){
            $('.tooltipController').css('display','none');
        }, 200);

    });


    $(document).on('click', '.language-control ', function (e) {

        if($('.tooltipController').css('display') != 'none')
            $('.tooltipController').css('display','none');
        else
            $('.tooltipController').css('display','inline-block');

    });




    var timerForAudioToggleRight = false;
    var VolumeInDragMode = false;
    var pendingMouseLeaveSoundBar = false;
    $(document).on('mouseover', '.changeVolume , .bar-sound-setting', function (e) {

        $('.bar-sound-setting').css('display','inline-block');
        $("#fleeq-chat-launcher").css('opacity',0);
        clearTimeout(timerForAudioToggleRight);
    });


    function removeVolumeBar()
    {
        if(!VolumeInDragMode)
        {
            timerForAudioToggleRight = setTimeout(function(){
                $('.bar-sound-setting').css('display','none');
                $("#fleeq-chat-launcher").css('opacity',1);
            }, 200);
        }
        else
        {
            pendingMouseLeaveSoundBar = true;
        }
    }


    $(document).on('mouseleave', '.changeVolume , .bar-sound-setting', function () {

        removeVolumeBar();

    });



    function ellipse(str, max){
        return str.length > (max - 3) ? str.substring(0,max-3) + '...' : str;
    }
    ellipse("some string", 7); // "some...";



    // string.prototype.trunc = String.prototype.trunc ||
    //     function(n){
    //         return (this.length > n) ? this.substr(0, n-1) + '&hellip;' : this;
    //     };



    $(document).on("click", ".left-steps-section  .step-entry", function() {
        var toScreen = $(this).data('screen-num');
        var percentageStart = 0;
        if(toScreen > 0)
        {
            percentageStart = parseFloat($('.tl-el[screen-num="'+toScreen+'"]').attr('start-position'));
            percentageStart += parseFloat(transitionDelay/time)*100
        }
        changeLocationOnTimeline(percentageStart, false);
        if(stepByStepFlow) {
            stepByStepFlow = false;
            setTimeout(function(){stepByStepFlow = true;},1000);
            $('#flow-options').toggleClass("active", false);
            if(pauseMode)
                moveToPlay(false);
            document.onkeydown =  saved_keydown;
            setTimeout(function(e){
                canTransit = true;
                DisplayCurrentItem();
                _pingTrack();
            }, transitionDelay*1.1)
        }
    })



    $(document).on("click", ".series-item", function() {
        var codeKeyInSeries = $(this).data('fleeq-entry');
        if(codeKeyInSeries == curr_code_key)
            return 0 ;
        var toURL = full_domain_link+'l/'+codeKeyInSeries;
        const additionalParams = _getURLAdditionalParams();
        if(additionalParams.length > 0) {
            toURL += '?'+additionalParams;
        }
        window.location = toURL;
    });



    $(document).on("click", ".lang-list-item span", function() {
        var codeKeyForLocalized = $(this).data('fleeq-entry');
        // if(codeKeyInSeries == curr_code_key)
        //     return 0 ;
        const parts = window.location.pathname.split("/");
        var params = parts[2].split("&");
        params[0] = codeKeyForLocalized;
        var paramsString = params.join("&");
        if(params.length == 1 && window.location.search){
            paramsString = codeKeyForLocalized+window.location.search;
        }
        var toURL = full_domain_link+'l/'+paramsString;
        window.location = toURL;
    })


    function addToolTipToParent(element, text, direction){
        $(element).tooltip('destroy');
        $(element).attr('data-toggle','tooltip')
            .attr('data-placement',direction)
            .attr('data-original-title',text)
            .tooltip({ container: $(element).parent(), html: true });
    }



    function copyToClipboard(elem, restoreSelection) {
        // create hidden text element, if it doesn't already exist
        var targetId = "_hiddenCopyText_";
        var isInput = elem.tagName === "INPUT" || elem.tagName === "TEXTAREA";
        var origSelectionStart, origSelectionEnd;
        if (isInput) {
            // can just use the original source element for the selection and copy
            target = elem;
            origSelectionStart = elem.selectionStart;
            origSelectionEnd = elem.selectionEnd;
        } else {
            // must use a temporary form element for the selection and copy
            target = document.getElementById(targetId);
            if (!target) {
                var target = document.createElement("textarea");
                target.style.position = "absolute";
                target.style.left = "-9999px";
                target.style.top = "0";
                target.id = targetId;
                document.body.appendChild(target);
            }
            target.textContent = elem.textContent;
        }
        // select the content
        var currentFocus = document.activeElement;
        target.focus();
        target.setSelectionRange(0, target.value.length);

        // copy the selection
        var succeed;
        try {
            succeed = document.execCommand("copy");
        } catch(e) {
            succeed = false;
        }
        // restore original focus
        if (currentFocus && typeof currentFocus.focus === "function") {
            currentFocus.focus();
        }

        if (isInput) {
            // restore prior selection
            if(restoreSelection) {
                elem.setSelectionRange(origSelectionStart, origSelectionEnd);
            }
        } else {
            // clear temporary content
            target.textContent = "";
        }

        return succeed;
    }




    function copyToClipboardWrapper(domClickButton, domCopyTarget)
    {
        var success = copyToClipboard(domCopyTarget, false);
        var actionMsg = '',action = 'copy',actionKey = 'C';//(action === 'cut' ? 'X' : 'C');
        if(success){
            $(this).blur();
            actionMsg = 'Copied!';
        }else{

            if(/iPhone|iPad/i.test(navigator.userAgent)) {
                actionMsg = 'No support :(';
            }
            else if (/Mac/i.test(navigator.userAgent)) {
                actionMsg = 'Press ⌘-' + actionKey + ' to ' + action;
            }
            else {
                actionMsg = 'Press Ctrl-' + actionKey + ' to ' + action;
            }
        }
        addToolTipToParent($(domClickButton), actionMsg, "top");
        $(domClickButton).tooltip('show');
        setTimeout(function(){
            $(domClickButton).tooltip('destroy');
        }, 2000);
    }







    var vSignInSpecificTime;
    var muteButtonSvg, volumeButtonSvg, volumeButtonSvg_2,  volumeButtonSvg_3, muteFullButtonSvg, allowFullScreenMinimize , allowFullScreen;

    function addVideoControllers()
    {






        if($('.bottom-vid-drawer').length > 0)
        {
            $('.bottom-vid-drawer').remove();

        }



        $('.preInfo').css('display', 'none');
        var exstyle = '';
        if(isMobileDevice)
        {
            w = mobileScreenWidth;
            w = w -10;
            exstyle = 'width:'+w+'px;'



        }




        var styleTimeline = 'display:block; opacity:1;';
        if(isGif)
        {
            styleTimeline = 'display:block; opacity:0 !important;';
        }

        extraClassTL = '';
        if(isInIframe) {
            extraClassTL = window.name;
            if ((window.name == 'inlineSolo') || (window.name == 'inlineSoloMini') || (window.name == 'inlineSoloBig') || (window.name == 'inlineSoloBigNoCTA'))
            {

                styleTimeline = 'display:block;';
                if(isGif)
                {
                    styleTimeline = styleTimeline+' opacity:0 !important;';
                }



            }


        }


        var vidTimeLine = '<div class="blackCurtain2 " style=" width: 100%; height: 100%;     position: absolute; z-index: 10000; display: none;"></div>' +
            '<div class="timeline" style=" '+styleTimeline+'">' +

                                    '<div class="tl '+extraClassTL+'" style="'+exstyle+'" >' +
            '<div class="tl-hover-layer '+extraClassTL+' "></div>'+
                                        '<div       class="tl-over-prefix"></div>' +
            '<div class="tl-over">' +
            '</div></div></div>';



        var playButtonSvg = '<svg id="playButtonInControls" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 13.33 15.11" visibility="hidden" style="    width: 16px; margin-left: 6px; margin-top: 9px; left:8px; position: absolute; top:0px;" class="play b_svg"><defs><linearGradient id="New_Gradient_Swatch_copy_play" y1="7.56" x2="13.33" y2="7.56" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="'+grad_A+'"/><stop offset="1" stop-color="'+grad_B+'"/></linearGradient></defs><title>play</title><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><path d="M12.87,6.76,1.37.12A.92.92,0,0,0,0,.92V14.19A.92.92,0,0,0,1.37,15l11.5-6.64A.92.92,0,0,0,12.87,6.76Z" style="fill:url(#New_Gradient_Swatch_copy_play)"/></g></g></svg>';



        var nextButtonSvg =  '<svg  style="    width: 10px; left: 21px;  position: absolute; margin-top: 0px;" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 9.25 15.87" class="full  b_svg">' +
            '                   <defs>' +
                                    '<style>' +
                                        '.cls-1-nxt{isolation:isolate;}' +
                                        '.cls-2-nxt{fill:url(#New_Gradient_Swatch-nxt);}' +
                                    '</style>' +
                                    '<linearGradient id="New_Gradient_Swatch-nxt" y1="7.94" x2="9.25" y2="7.94" gradientUnits="userSpaceOnUse">' +
                                        '<stop offset="0" stop-color="'+grad_A+'"/>' +
                                        '<stop offset="1" stop-color="'+grad_B+'"/>' +
                                    '</linearGradient>' +
                                '</defs>' +
                                '<title>Next</title>' +
                                '<g id="Layer_2" data-name="Layer 2">' +
                                    '<g id="Layer_1-2" data-name="Layer 1">' +
                                        '<g id="Arrow">' +
                                            '<g id="_63-interface_-_arrow_right" data-name="63-interface - arrow right" class="cls-1-nxt">' +
                                                '<g id="_63-interface_-_arrow_right-2" data-name="63-interface - arrow right">' +
                                                    '<path class="cls-2-nxt" d="M9.07,7.46s-.07,0-.11,0L1.08.18a.63.63,0,0,0-.89.89L7.66,7.94.19,14.8a.63.63,0,1,0,.89.89L9,8.45s.07,0,.1,0a.71.71,0,0,0,0-.94Z"/>' +
                                                '</g>' +
                                            '</g>' +
                                        '</g>' +
                                    '</g>' +
                                '</g>' +
                            '</svg>';


        var nextButtonSvg =  '<svg style="    width: 10px; left: 21px;  position: absolute; margin-top: 0px;" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 8.21 13.48" class="full  b_svg"><defs><linearGradient id="New_Gradient_Swatch_copy_next" y1="6.74" x2="8.21" y2="6.74" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="'+grad_A+'"/><stop offset="1" stop-color="'+grad_B+'"/></linearGradient></defs><title>Next</title><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><path d="M8.18,6.91a.88.88,0,0,0,0-.17.88.88,0,0,0,0-.17.88.88,0,0,0,0-.16.85.85,0,0,0-.09-.16A.84.84,0,0,0,8,6.14L7.85,6,7.78,6,1.62.24A.89.89,0,0,0,.36.28L.24.42a.89.89,0,0,0,0,1.26L5.75,6.74.28,11.81a.89.89,0,0,0,0,1.25l.13.14a.89.89,0,0,0,1.26,0L7.78,7.53l.07-.05L8,7.35a.79.79,0,0,0,.07-.12.85.85,0,0,0,.09-.16A.88.88,0,0,0,8.18,6.91Z" style="fill:url(#New_Gradient_Swatch_copy_next)"/></g></g></svg>';





        var peviousButtonSvg = '<svg style="    width: 10px; margin-left: 21px;  margin-top: 0px;" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 8.21 13.48"  class="full  b_svg"><defs><linearGradient id="New_Gradient_Swatch_copy_prev" x1="-979.31" y1="6.74" x2="-971.1" y2="6.74" gradientTransform="matrix(-1, 0, 0, 1, -971.1, 0)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="'+grad_A+'"/><stop offset="1" stop-color="'+grad_B+'"/></linearGradient></defs><title>Back</title><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><path d="M0,6.91a.88.88,0,0,1,0-.17.88.88,0,0,1,0-.17.88.88,0,0,1,0-.16.85.85,0,0,1,.09-.16.84.84,0,0,1,.07-.12L.36,6,.43,6,6.59.24a.89.89,0,0,1,1.26,0L8,.42a.89.89,0,0,1,0,1.26L2.46,6.74l5.47,5.07a.89.89,0,0,1,0,1.25l-.13.14a.89.89,0,0,1-1.26,0L.43,7.53.36,7.48.23,7.35a.79.79,0,0,1-.07-.12.85.85,0,0,1-.09-.16A.88.88,0,0,1,0,6.91Z" style="fill:url(#New_Gradient_Swatch_copy_prev)"/></g></g></svg>';


        var visibilValue ="hidden";
        if(narration == '1')
        {
            var visibilValue ="visible";
        }


        volumeButtonSvg = '<svg    xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15.38 15.13"><title>sound</title><g id="Layer_2_11" data-name="Layer 211"><g id="Layer_1-211" data-name="Layer 111"><path d="M7.29,0a.78.78,0,0,0-.51.19h0L2.41,3.78H1.08A1.08,1.08,0,0,0,0,4.86v5.4a1.08,1.08,0,0,0,1.08,1.08H2.41l4.37,3.6h0a.85.85,0,0,0,.52.19.81.81,0,0,0,.81-.81V.81A.82.82,0,0,0,7.29,0Z" style="fill:'+grad_A+'"/><path d="M12.17,2.13h0a.52.52,0,0,0-.77.45.49.49,0,0,0,.21.43,5.16,5.16,0,0,1,0,9.1.51.51,0,0,0-.19.42.52.52,0,0,0,.52.52.42.42,0,0,0,.24-.07,6.18,6.18,0,0,0,0-10.85Z" style="fill:'+grad_A+'"/><path d="M13.22,7.56h0a4,4,0,0,0-2.37-3.66h0a.52.52,0,0,0-.75.46.55.55,0,0,0,.22.43l.07.05a3,3,0,0,1,0,5.48l-.06,0a.55.55,0,0,0-.23.44.52.52,0,0,0,.52.52.46.46,0,0,0,.23-.06h0A4,4,0,0,0,13.22,7.56Z" style="fill:'+grad_A+'"/><path d="M11.05,7.56h0A1.87,1.87,0,0,0,9.18,5.68a.53.53,0,0,0-.52.52.52.52,0,0,0,.52.52.84.84,0,0,1,0,1.67.52.52,0,0,0,0,1A1.87,1.87,0,0,0,11.05,7.56Z" style="fill:'+grad_A+'"/></g></g></svg>  ';


        volumeButtonSvg_2 = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 13.22 15.13"><title>sound</title><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-212" data-name="Layer 1"><path d="M7.29,0a.78.78,0,0,0-.51.19h0L2.41,3.78H1.08A1.08,1.08,0,0,0,0,4.86v5.4a1.08,1.08,0,0,0,1.08,1.08H2.41l4.37,3.6h0a.8.8,0,0,0,.52.2.82.82,0,0,0,.81-.82V.81A.82.82,0,0,0,7.29,0Z" style="fill:'+grad_A+'"/><path d="M10.85,3.89h0a.51.51,0,0,0-.75.46.55.55,0,0,0,.22.43l.07.05a3,3,0,0,1,0,5.48l-.06,0a.55.55,0,0,0-.23.44.52.52,0,0,0,.52.52.46.46,0,0,0,.23-.06h0a4,4,0,0,0,2.37-3.67h0A4,4,0,0,0,10.85,3.89Z" style="fill:'+grad_A+'"/><path d="M11.05,7.56h0A1.87,1.87,0,0,0,9.18,5.68a.53.53,0,0,0-.52.52.52.52,0,0,0,.52.52.84.84,0,0,1,0,1.67.52.52,0,0,0,0,1A1.87,1.87,0,0,0,11.05,7.56Z" style="fill:'+grad_A+'"/></g></g></svg>';


        volumeButtonSvg_3 = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 11.05 15.13"><title>sound</title><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-213" data-name="Layer 1"><path d="M7.29,0a.78.78,0,0,0-.51.19h0L2.41,3.78H1.08A1.08,1.08,0,0,0,0,4.86v5.4a1.08,1.08,0,0,0,1.08,1.08H2.41l4.37,3.6h0a.8.8,0,0,0,.52.2.82.82,0,0,0,.81-.82V.81A.82.82,0,0,0,7.29,0Z" style="fill:'+grad_A+'"/><path d="M9.18,5.68a.53.53,0,0,0-.52.52.52.52,0,0,0,.52.52.84.84,0,0,1,0,1.67.52.52,0,0,0,0,1,1.87,1.87,0,0,0,1.87-1.87h0A1.87,1.87,0,0,0,9.18,5.68Z" style="fill:'+grad_A+'"/></g></g></svg>';


        muteButtonSvg = '<svg  xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8.11 15.13"><title>sound</title><g id="Layer_2_14" data-name="Layer 2"><g id="Layer_1-214" data-name="Layer 1"><path d="M7.29,0a.78.78,0,0,0-.51.19h0L2.41,3.78H1.08A1.08,1.08,0,0,0,0,4.86v5.4a1.08,1.08,0,0,0,1.08,1.08H2.41l4.37,3.6h0a.85.85,0,0,0,.52.19.82.82,0,0,0,.81-.82V.81A.82.82,0,0,0,7.29,0Z" style="fill:'+grad_A+'"/></g></g></svg>';



        muteFullButtonSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 13.73 15.13"><title>Mute</title><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><path d="M7.29,0a.78.78,0,0,0-.51.19h0L2.41,3.78H1.08A1.08,1.08,0,0,0,0,4.86v5.4a1.08,1.08,0,0,0,1.08,1.08H2.41l4.37,3.6h0a.85.85,0,0,0,.52.19.82.82,0,0,0,.81-.82V.81A.82.82,0,0,0,7.29,0Z" style="fill:'+grad_A+'"/><g id="Cancel"><path d="M13.61,9.55a.39.39,0,0,1-.56,0L11.63,8.13,10.2,9.55a.39.39,0,0,1-.56,0,.39.39,0,0,1,0-.56l1.42-1.43L9.64,6.14a.4.4,0,1,1,.56-.56L11.63,7l1.42-1.42a.4.4,0,1,1,.56.56L12.19,7.56,13.61,9A.39.39,0,0,1,13.61,9.55Z" style="fill:'+grad_A+'"/></g></g></g></svg>';







        var pauseButtonSvg = '<svg id="pauseButtonInControls" style=" " xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 10.3 15.14" class="pause b_svg"><defs><linearGradient id="New_Gradient_Swatch_copy_pause" x1="4.4" y1="11.79" x2="12.9" y2="3.35" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="'+grad_A+'"/><stop offset="1" stop-color="'+grad_B+'"/></linearGradient><linearGradient id="New_Gradient_Swatch_copy_pause-2" x1="-2.6" y1="11.79" x2="5.9" y2="3.35" xlink:href="#New_Gradient_Swatch_copy_pause"/></defs><title>pause</title><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><path d="M8.65,15.14c-.91,0-1.65-.46-1.65-1V1c0-.57.74-1,1.65-1S10.3.46,10.3,1V14.11C10.3,14.68,9.56,15.14,8.65,15.14Z" style="fill:url(#New_Gradient_Swatch_copy_pause)"/><path d="M1.65,15.14c-.91,0-1.65-.46-1.65-1V1C0,.46.74,0,1.65,0S3.3.46,3.3,1V14.11C3.3,14.68,2.56,15.14,1.65,15.14Z" style="fill:url(#New_Gradient_Swatch_copy_pause-2)"/></g></g></svg>';






        var visibilValue ="hidden";
        if(narration == '0')
        {
            var visibilValue ="visible";
        }






        allowFullScreen = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 15.96 15.96"  style="cursor: pointer;"><defs><linearGradient id="New_Gradient_Swatch_copy_fs" y1="2.98" x2="5.96" y2="2.98" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="'+grad_A+'"/><stop offset="1" stop-color="'+grad_B+'"/></linearGradient><linearGradient id="New_Gradient_Swatch_copy_fs-2" x1="445.88" y1="2.98" x2="451.84" y2="2.98" gradientTransform="matrix(-1, 0, 0, 1, 461.84, 0)" xlink:href="#New_Gradient_Swatch_copy_fs"/><linearGradient id="New_Gradient_Swatch_copy_fs-3" x1="445.88" y1="155.81" x2="451.84" y2="155.81" gradientTransform="translate(461.84 168.79) rotate(180)" xlink:href="#New_Gradient_Swatch_copy_fs"/><linearGradient id="New_Gradient_Swatch_copy_fs-4" x1="0" y1="155.81" x2="5.96" y2="155.81" gradientTransform="matrix(1, 0, 0, -1, 0, 168.79)" xlink:href="#New_Gradient_Swatch_copy_fs"/></defs><title>full screen</title><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><path d="M6,.5a.5.5,0,0,0-.5-.5H.5A.5.5,0,0,0,0,.5v5A.5.5,0,0,0,.5,6H1.81a.5.5,0,0,0,.5-.5V2.31H5.46a.5.5,0,0,0,.5-.5Z" style="fill:url(#New_Gradient_Swatch_copy_fs)"/><path d="M10,.5a.5.5,0,0,1,.5-.5h5a.5.5,0,0,1,.5.5v5a.5.5,0,0,1-.5.5H14.15a.5.5,0,0,1-.5-.5V2.31H10.5a.5.5,0,0,1-.5-.5Z" style="fill:url(#New_Gradient_Swatch_copy_fs-2)"/><path d="M10,15.46a.5.5,0,0,0,.5.5h5a.5.5,0,0,0,.5-.5v-5a.5.5,0,0,0-.5-.5H14.15a.5.5,0,0,0-.5.5v3.15H10.5a.5.5,0,0,0-.5.5Z" style="fill:url(#New_Gradient_Swatch_copy_fs-3)"/><path d="M6,15.46a.5.5,0,0,1-.5.5H.5a.5.5,0,0,1-.5-.5v-5A.5.5,0,0,1,.5,10H1.81a.5.5,0,0,1,.5.5v3.15H5.46a.5.5,0,0,1,.5.5Z" style="fill:url(#New_Gradient_Swatch_copy_fs-4)"/></g></g></svg>';



        allowFullScreenMinimize = '<?xml version="1.0" encoding="utf-8"?>\n' +
            '<!-- Generator: Adobe Illustrator 22.0.1, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->\n' +
            '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\n' +
            '\t viewBox="0 0 16 16" style="enable-background:new 0 0 16 16;" xml:space="preserve">\n' +
            '<style type="text/css">\n' +
            '\t.st0{fill:'+grad_A+';}\n' +
            '</style>\n' +
            '<title>Minimize</title>\n' +
            '<g id="Layer_2_1_">\n' +
            '\t<g id="Layer_1-2">\n' +
            '\t\t<g id="Layer_2-2">\n' +
            '\t\t\t<g id="Layer_1-2-2">\n' +
            '\t\t\t\t<path class="st0" d="M0,5.5C0,5.8,0.2,6,0.5,6h5C5.8,6,6,5.8,6,5.5v-5C6,0.2,5.8,0,5.5,0H4.2C3.9,0,3.7,0.2,3.7,0.5v3.2H0.5\n' +
            '\t\t\t\t\tC0.3,3.7,0,3.9,0,4.2L0,5.5z"/>\n' +
            '\t\t\t\t<path class="st0" d="M16,5.5C16,5.8,15.8,6,15.5,6h-5C10.2,6,10,5.8,10,5.5v-5C10,0.2,10.2,0,10.5,0h1.4c0.3,0,0.5,0.2,0.5,0.5\n' +
            '\t\t\t\t\tv3.2h3.1c0.3,0,0.5,0.2,0.5,0.5V5.5z"/>\n' +
            '\t\t\t\t<path class="st0" d="M16,10.5c0-0.3-0.2-0.5-0.5-0.5h-5c-0.3,0-0.5,0.2-0.5,0.5v5c0,0.3,0.2,0.5,0.5,0.5h1.4\n' +
            '\t\t\t\t\tc0.3,0,0.5-0.2,0.5-0.5v-3.1h3.1c0.3,0,0.5-0.2,0.5-0.5V10.5z"/>\n' +
            '\t\t\t\t<path class="st0" d="M0,10.5C0,10.2,0.2,10,0.5,10h5C5.8,10,6,10.2,6,10.5v5C6,15.8,5.8,16,5.5,16H4.2c-0.3,0-0.5-0.2-0.5-0.5\n' +
            '\t\t\t\t\tv-3.1H0.5c-0.3,0-0.5-0.2-0.5-0.5L0,10.5z"/>\n' +
            '\t\t\t</g>\n' +
            '\t\t</g>\n' +
            '\t</g>\n' +
            '</g>\n' +
            '</svg>'



        var captionsSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 19.48 12.98"><title>Captions</title><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><path d="M17.91,1.55v9.88H1.57V1.55H17.91M18.31,0H1.16A1.15,1.15,0,0,0,0,1.15V11.83A1.15,1.15,0,0,0,1.16,13H18.31a1.15,1.15,0,0,0,1.17-1.15V1.15A1.15,1.15,0,0,0,18.31,0Z" style="fill:'+grad_A+'"/><rect x="3.89" y="4.12" width="11.91" height="1.54" style="fill:'+grad_A+'"/><rect x="6.52" y="7.39" width="6.64" height="1.54" style="fill:'+grad_A+'"/></g></g></svg>';




        var logoSVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 55.45 16.86"><title>Fleeq</title><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><path d="M21.68,1.83a1.52,1.52,0,0,1,1.07-.33l.46.06a1.9,1.9,0,0,0,.4.05.61.61,0,0,0,.45-.2A.63.63,0,0,0,24.14.6a.7.7,0,0,0-.29-.25A3.19,3.19,0,0,0,22.35,0,2.71,2.71,0,0,0,21.1.3a2.32,2.32,0,0,0-1,1A3.43,3.43,0,0,0,19.76,3V4h-1a.65.65,0,0,0-.48.19.64.64,0,0,0-.2.48.67.67,0,0,0,.2.48.66.66,0,0,0,.48.2h1V12.1a.76.76,0,0,0,.22.56.74.74,0,0,0,.55.22.8.8,0,0,0,.57-.22.77.77,0,0,0,.23-.56V5.33h2.16a.63.63,0,0,0,.48-.2.67.67,0,0,0,.2-.48.64.64,0,0,0-.2-.48A.62.62,0,0,0,23.49,4H21.33V3A1.64,1.64,0,0,1,21.68,1.83Z" style="fill:#fff"/><path d="M26.13.09a.71.71,0,0,0-.55.23.79.79,0,0,0-.23.56V12.1a.77.77,0,0,0,.23.56.74.74,0,0,0,.55.22.8.8,0,0,0,.57-.22.77.77,0,0,0,.23-.56V.88A.78.78,0,0,0,26.7.31.77.77,0,0,0,26.13.09Z" style="fill:#fff"/><path d="M34.38,4.4a4.41,4.41,0,0,0-4.51,0,3.85,3.85,0,0,0-1.39,1.68A5.64,5.64,0,0,0,28,8.39a4.61,4.61,0,0,0,1.19,3.38A4.4,4.4,0,0,0,32.51,13a6.59,6.59,0,0,0,1.7-.19,6.83,6.83,0,0,0,1.33-.57.76.76,0,0,0,.45-.64.64.64,0,0,0-.21-.49.73.73,0,0,0-.49-.19A.82.82,0,0,0,35,11a4.7,4.7,0,0,1-1.06.4,5.3,5.3,0,0,1-1.27.14,3.11,3.11,0,0,1-2.13-.68,2.8,2.8,0,0,1-.9-1.88h5.86a.75.75,0,0,0,.58-.23.74.74,0,0,0,.22-.55A4.93,4.93,0,0,0,35.8,6,4,4,0,0,0,34.38,4.4ZM29.62,7.66a2.9,2.9,0,0,1,.43-1.42,2.4,2.4,0,0,1,1-.84,2.61,2.61,0,0,1,2.31,0,2.4,2.4,0,0,1,1,.84,2.71,2.71,0,0,1,.44,1.42Z" style="fill:#fff"/><path d="M43.73,4.4a4.41,4.41,0,0,0-4.51,0,3.85,3.85,0,0,0-1.39,1.68,5.64,5.64,0,0,0-.45,2.27,4.61,4.61,0,0,0,1.19,3.38A4.42,4.42,0,0,0,41.86,13a6.59,6.59,0,0,0,1.7-.19,6.83,6.83,0,0,0,1.33-.57.76.76,0,0,0,.45-.64.64.64,0,0,0-.21-.49.73.73,0,0,0-.48-.19.83.83,0,0,0-.32.07,4.7,4.7,0,0,1-1.06.4A5.3,5.3,0,0,1,42,11.5a3.11,3.11,0,0,1-2.13-.68A2.89,2.89,0,0,1,39,8.94h5.87a.78.78,0,0,0,.58-.23.77.77,0,0,0,.21-.55A4.93,4.93,0,0,0,45.15,6,4,4,0,0,0,43.73,4.4ZM39,7.66a2.81,2.81,0,0,1,.44-1.42,2.32,2.32,0,0,1,1-.84,2.61,2.61,0,0,1,2.31,0,2.34,2.34,0,0,1,1,.84,2.81,2.81,0,0,1,.45,1.42Z" style="fill:#fff"/><path d="M55.22,4.12a.75.75,0,0,0-.55-.23.77.77,0,0,0-.56.23.71.71,0,0,0-.23.55v.45a4,4,0,0,0-3-1.32,4.07,4.07,0,0,0-2,.55,4.11,4.11,0,0,0-1.56,1.59,4.84,4.84,0,0,0-.6,2.45,4.8,4.8,0,0,0,.6,2.44,4.11,4.11,0,0,0,1.56,1.59,4,4,0,0,0,5-.77v4.41a.74.74,0,0,0,.23.57.77.77,0,0,0,.56.23.75.75,0,0,0,.55-.23.81.81,0,0,0,.23-.57V4.67A.75.75,0,0,0,55.22,4.12ZM53.88,10.2a4.2,4.2,0,0,1-1.24.94,3.25,3.25,0,0,1-1.5.36,2.7,2.7,0,0,1-2-.81,3.2,3.2,0,0,1-.78-2.3,3.17,3.17,0,0,1,.78-2.3,2.67,2.67,0,0,1,2-.82,3.25,3.25,0,0,1,1.5.36,4.2,4.2,0,0,1,1.24.94Z" style="fill:#fff"/><path d="M4.72,4.14a.3.3,0,0,0-.3.29v.44A2.48,2.48,0,0,0,2.57,4C1,4,0,5.24,0,7s1,3,2.57,3a2.54,2.54,0,0,0,1.85-.83v1.58a1.66,1.66,0,0,1-1.85,1.76,2,2,0,0,1-1.64-.63.31.31,0,0,0-.22-.09.29.29,0,0,0-.3.3.32.32,0,0,0,.09.23,2.57,2.57,0,0,0,2.07.75A2.14,2.14,0,0,0,5,10.79V4.43A.29.29,0,0,0,4.72,4.14ZM.62,7c0-1.49.77-2.46,1.95-2.46a2.3,2.3,0,0,1,1.85,1V8.47a2.3,2.3,0,0,1-1.85,1C1.39,9.49.62,8.53.62,7Z" style="fill:#fff"/><path d="M9.22,10a2.82,2.82,0,0,0,2.1-.86A.26.26,0,0,0,11.41,9a.27.27,0,0,0-.28-.28.25.25,0,0,0-.19.07,2.32,2.32,0,0,1-1.72.71A2.18,2.18,0,0,1,7.05,7.26h4.39a.34.34,0,0,0,.33-.37A2.67,2.67,0,0,0,9.1,4,2.83,2.83,0,0,0,6.41,7,2.81,2.81,0,0,0,9.22,10ZM7.05,6.7a2.15,2.15,0,0,1,2-2.12A2.11,2.11,0,0,1,11.15,6.7Z" style="fill:#fff"/><path d="M12.58,4.72h.65V8.8c0,.79.38,1.22,1.06,1.22a1.21,1.21,0,0,0,.83-.28.28.28,0,0,0,.09-.22.27.27,0,0,0-.28-.28.46.46,0,0,0-.23.09.6.6,0,0,1-.41.14c-.39,0-.47-.37-.47-.67V4.72h.85A.29.29,0,0,0,15,4.43a.28.28,0,0,0-.28-.27h-.85V2.94a.3.3,0,0,0-.29-.3.31.31,0,0,0-.3.3V4.16h-.65a.28.28,0,0,0-.28.27A.29.29,0,0,0,12.58,4.72Z" style="fill:#fff"/><path d="M15.52,12.15H6.75a.25.25,0,0,0-.25.25.25.25,0,0,0,.25.25h8.77a.26.26,0,0,0,.25-.25A.25.25,0,0,0,15.52,12.15Z" style="fill:#fff"/></g></g></svg>';

        var langSVG = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="0 0 512 512" enable-background="new 0 0 512 512" ><title>Languages</title><g><path fill="'+grad_A+'" d="m429.2,82.8c-46.2-46.3-107.8-71.8-173.2-71.8s-127,25.5-173.2,71.8-71.8,107.8-71.8,173.2 25.5,127 71.8,173.2 107.8,71.8 173.2,71.8 127-25.5 173.2-71.8 71.8-107.8 71.8-173.2-25.5-127-71.8-173.2zm49.6,162.2h-95c-0.9-37.8-6.2-74.2-15.5-106.5 18.1-9.3 35-21 50.5-34.8 35,37.4 57.3,86.8 60,141.3zm-211.8,22h94.9c-0.8,34.8-5.6,68.1-13.9,97.9-25.6-10.3-52.9-16.3-81-17.6v-80.3zm136-178.6c-12.8,11.3-26.8,20.9-41.6,28.9-3.8-10.6-8.1-20.6-12.9-30-9.5-18.8-20.3-34.2-32.2-46 32.5,9.1 62,25.4 86.7,47.1zm-136-52c22.9,5.1 44.5,26.2 61.9,60.6 4.7,9.3 8.9,19.2 12.6,29.7-23.5,9.7-48.6,15.4-74.5,16.7v-107zm81.1,111.4c8.2,29.6 12.9,62.7 13.7,97.3h-94.8v-79.6c28.2-1.3 55.5-7.4 81.1-17.7zm-103.1,97.2h-94.9c0.8-34.6 5.5-67.7 13.7-97.3 25.6,10.4 53,16.4 81.1,17.6v79.7zm.1-208.6v107c-25.9-1.3-51.1-7-74.5-16.7 3.7-10.5 7.9-20.4 12.6-29.7 17.4-34.4 39-55.5 61.9-60.6zm-49.3,4.9c-11.9,11.8-22.7,27.3-32.2,46-4.7,9.4-9,19.4-12.9,30-14.8-8-28.7-17.6-41.6-28.9 24.7-21.7 54.2-38 86.7-47.1zm-102.5,62.4c15.5,13.8 32.4,25.4 50.5,34.8-9.3,32.4-14.7,68.7-15.5,106.5h-95c2.7-54.5 25-103.9 60-141.3zm-60,163.3h95c0.9,38.1 6.3,74.6 15.7,107.1-18,9.3-34.9,20.8-50.3,34.6-35.3-37.5-57.7-87-60.4-141.7zm76.2,157c12.8-11.2 26.7-20.8 41.4-28.7 3.8,10.3 8,20.2 12.7,29.4 9.5,18.8 20.3,34.2 32.2,46.1-32.3-9.1-61.7-25.3-86.3-46.8zm135.6,51.6c-22.9-5.1-44.5-26.2-61.9-60.6-4.6-9.1-8.7-18.8-12.4-29.1 23.4-9.7 48.5-15.4 74.3-16.6v106.3zm-81-110.7c-8.3-29.8-13.1-63.1-13.9-97.9h94.9v80.3c-28.1,1.2-55.4,7.2-81,17.6zm103,110.7v-106.3c25.8,1.3 50.9,6.9 74.3,16.6-3.7,10.3-7.8,20-12.4,29.1-17.4,34.4-39,55.5-61.9,60.6zm49.3-4.9c11.9-11.8 22.7-27.3 32.2-46.1 4.7-9.2 8.9-19.1 12.7-29.4 14.7,7.9 28.6,17.5 41.4,28.7-24.6,21.6-54,37.8-86.3,46.8zm102.2-62c-15.4-13.7-32.3-25.3-50.3-34.6 9.4-32.5 14.8-69.1 15.7-107.1h95c-2.8,54.7-25.2,104.2-60.4,141.7z"/></g></svg>';

        var stepsSVG = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Capa_1" x="0px" y="0px" viewBox="0 0 511.626 511.626" style="enable-background:new 0 0 511.626 511.626;" xml:space="preserve"><title>Step by step</title><g><g><path d="M54.818,200.999c-15.23,0-28.171,5.327-38.832,15.987C5.33,227.642,0,240.583,0,255.813c0,15.223,5.33,28.172,15.99,38.83 c10.66,10.656,23.604,15.984,38.832,15.984c15.225,0,28.167-5.328,38.828-15.984c10.657-10.657,15.987-23.606,15.987-38.83 c0-15.23-5.33-28.171-15.99-38.828C82.989,206.329,70.046,200.999,54.818,200.999z" fill="'+grad_A+'"/><path d="M54.821,54.817c-15.23,0-28.171,5.33-38.832,15.987C5.333,81.464,0.003,94.405,0.003,109.632   c0,15.229,5.327,28.171,15.986,38.831c10.66,10.657,23.604,15.985,38.832,15.985c15.225,0,28.167-5.329,38.828-15.985    c10.657-10.66,15.987-23.603,15.987-38.831c0-15.227-5.33-28.168-15.987-38.828C82.993,60.147,70.051,54.817,54.821,54.817z" fill="'+grad_A+'"/><path d="M54.821,347.18c-15.23,0-28.175,5.325-38.832,15.981C5.333,373.824,0.003,386.767,0.003,401.989   c0,15.235,5.327,28.171,15.986,38.834c10.66,10.657,23.604,15.985,38.832,15.985c15.225,0,28.167-5.328,38.828-15.985    c10.657-10.663,15.987-23.599,15.987-38.834c0-15.223-5.33-28.172-15.987-38.828C82.993,352.505,70.051,347.18,54.821,347.18z" fill="'+grad_A+'"/><path d="M508.917,75.8c-1.813-1.803-3.949-2.708-6.427-2.708H155.313c-2.473,0-4.615,0.902-6.423,2.708   c-1.807,1.812-2.712,3.949-2.712,6.423v54.821c0,2.475,0.905,4.611,2.712,6.424c1.809,1.805,3.951,2.708,6.423,2.708H502.49   c2.478,0,4.616-0.9,6.427-2.708c1.81-1.812,2.71-3.949,2.71-6.424V82.224C511.626,79.75,510.723,77.609,508.917,75.8z" fill="'+grad_A+'"/><path d="M502.49,219.271H155.313c-2.473,0-4.615,0.9-6.423,2.712c-1.807,1.807-2.712,3.949-2.712,6.423v54.819    c0,2.472,0.905,4.613,2.712,6.421c1.809,1.813,3.951,2.714,6.423,2.714H502.49c2.478,0,4.616-0.9,6.427-2.714   c1.81-1.808,2.71-3.949,2.71-6.421v-54.819c0-2.474-0.903-4.62-2.71-6.423C507.103,220.175,504.967,219.271,502.49,219.271z" fill="'+grad_A+'"/><path d="M502.49,365.447H155.313c-2.473,0-4.615,0.903-6.423,2.714c-1.807,1.81-2.712,3.949-2.712,6.42V429.4    c0,2.478,0.905,4.616,2.712,6.427c1.809,1.807,3.951,2.707,6.423,2.707H502.49c2.478,0,4.616-0.9,6.427-2.707    c1.81-1.811,2.71-3.949,2.71-6.427v-54.819c0-2.471-0.903-4.617-2.71-6.42C507.103,366.357,504.967,365.447,502.49,365.447z" fill="'+grad_A+'"/></g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g></svg>';




        var seriesSVG = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 30.88 30.88"><title>Playlist</title><defs><linearGradient id="linear-gradient" x1="15.44" y1="7.11" x2="15.44" y2="9.11" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0.5"/></linearGradient><linearGradient id="linear-gradient-2" x1="15.44" y1="11.85" x2="15.44" y2="23.77" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0.7"/></linearGradient><linearGradient id="linear-gradient-3" x1="15.44" y1="9.16" x2="15.44" y2="11.85" xlink:href="#linear-gradient"/></defs><title>playlist_topicons</title><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><circle cx="15.44" cy="15.44" r="15.44" style="opacity:0.30000000000000004"/><g style="opacity:0.4"><rect x="10.56" y="7.11" width="9.75" height="2" style="fill:url(#linear-gradient)"/></g><g style="opacity:0.8"><rect x="6.32" y="11.85" width="18.25" height="11.92" style="fill:url(#linear-gradient-2)"/></g><g style="opacity:0.6"><rect x="8.51" y="9.16" width="13.87" height="2.69" style="fill:url(#linear-gradient-3)"/></g><polygon points="18.47 17.73 13.93 15.1 13.93 20.35 18.47 17.73" style="fill:#fff"/></g></g></svg>';


        var socialSVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30.88 30.88"><title>Share</title><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><circle cx="15.44" cy="15.44" r="15.44" style="opacity:0.30000000000000004"/><g id="share" style="opacity:0.8"><path d="M19.24,23.13a2.69,2.69,0,0,0,0-5.37,2.72,2.72,0,0,0-1.94.82l-5.36-2.87a2.74,2.74,0,0,0,0-1.14L17.3,11.7a2.69,2.69,0,1,0-.75-1.86,2.76,2.76,0,0,0,.06.57l-5.37,2.87a2.65,2.65,0,0,0-1.93-.83A2.69,2.69,0,1,0,11.24,17l5.37,2.86a2.78,2.78,0,0,0-.06.58A2.68,2.68,0,0,0,19.24,23.13Z" style="fill:#fff"/></g></g></g></svg>';


        var deleteSVG = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Capa_1" x="0px" y="0px"  viewBox="0 0 348.333 348.334" style="enable-background:new 0 0 348.333 348.334;" xml:space="preserve"><title>Close</title><g><path d="M336.559,68.611L231.016,174.165l105.543,105.549c15.699,15.705,15.699,41.145,0,56.85   c-7.844,7.844-18.128,11.769-28.407,11.769c-10.296,0-20.581-3.919-28.419-11.769L174.167,231.003L68.609,336.563   c-7.843,7.844-18.128,11.769-28.416,11.769c-10.285,0-20.563-3.919-28.413-11.769c-15.699-15.698-15.699-41.139,0-56.85   l105.54-105.549L11.774,68.611c-15.699-15.699-15.699-41.145,0-56.844c15.696-15.687,41.127-15.687,56.829,0l105.563,105.554   L279.721,11.767c15.705-15.687,41.139-15.687,56.832,0C352.258,27.466,352.258,52.912,336.559,68.611z" fill="#FFFFFF"/></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g></svg>'

        var fbIcon = '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"   viewBox="0 0 408.788 408.788" style="enable-background:new 0 0 408.788 408.788;" xml:space="preserve"><path style="fill:#909090;" d="M353.701,0H55.087C24.665,0,0.002,24.662,0.002,55.085v298.616c0,30.423,24.662,55.085,55.085,55.085 h147.275l0.251-146.078h-37.951c-4.932,0-8.935-3.988-8.954-8.92l-0.182-47.087c-0.019-4.959,3.996-8.989,8.955-8.989h37.882 v-45.498c0-52.8,32.247-81.55,79.348-81.55h38.65c4.945,0,8.955,4.009,8.955,8.955v39.704c0,4.944-4.007,8.952-8.95,8.955 l-23.719,0.011c-25.615,0-30.575,12.172-30.575,30.035v39.389h56.285c5.363,0,9.524,4.683,8.892,10.009l-5.581,47.087 c-0.534,4.506-4.355,7.901-8.892,7.901h-50.453l-0.251,146.078h87.631c30.422,0,55.084-24.662,55.084-55.084V55.085 C408.786,24.662,384.124,0,353.701,0z"/><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g></svg>';



        var twitterIcon = '<svg version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"  viewBox="0 0 455.731 455.731" style="enable-background:new 0 0 455.731 455.731;" xml:space="preserve"><title>Facebook</title> <g> <rect x="0" y="0" style="fill:#909090;" width="455.731" height="455.731"/> <path style="fill:#333333;" d="M60.377,337.822c30.33,19.236,66.308,30.368,104.875,30.368c108.349,0,196.18-87.841,196.18-196.18 c0-2.705-0.057-5.39-0.161-8.067c3.919-3.084,28.157-22.511,34.098-35c0,0-19.683,8.18-38.947,10.107 c-0.038,0-0.085,0.009-0.123,0.009c0,0,0.038-0.019,0.104-0.066c1.775-1.186,26.591-18.079,29.951-38.207 c0,0-13.922,7.431-33.415,13.932c-3.227,1.072-6.605,2.126-10.088,3.103c-12.565-13.41-30.425-21.78-50.25-21.78 c-38.027,0-68.841,30.805-68.841,68.803c0,5.362,0.617,10.581,1.784,15.592c-5.314-0.218-86.237-4.755-141.289-71.423 c0,0-32.902,44.917,19.607,91.105c0,0-15.962-0.636-29.733-8.864c0,0-5.058,54.416,54.407,68.329c0,0-11.701,4.432-30.368,1.272 c0,0,10.439,43.968,63.271,48.077c0,0-41.777,37.74-101.081,28.885L60.377,337.822z"/></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g></svg>';



        var linkedinIcon = '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"  viewBox="0 0 382 382" style="enable-background:new 0 0 382 382;" xml:space="preserve"> <title>Twitter</title><path style="fill:#909090;" d="M347.445,0H34.555C15.471,0,0,15.471,0,34.555v312.889C0,366.529,15.471,382,34.555,382h312.889 C366.529,382,382,366.529,382,347.444V34.555C382,15.471,366.529,0,347.445,0z M118.207,329.844c0,5.554-4.502,10.056-10.056,10.056 H65.345c-5.554,0-10.056-4.502-10.056-10.056V150.403c0-5.554,4.502-10.056,10.056-10.056h42.806 c5.554,0,10.056,4.502,10.056,10.056V329.844z M86.748,123.432c-22.459,0-40.666-18.207-40.666-40.666S64.289,42.1,86.748,42.1 s40.666,18.207,40.666,40.666S109.208,123.432,86.748,123.432z M341.91,330.654c0,5.106-4.14,9.246-9.246,9.246H286.73 c-5.106,0-9.246-4.14-9.246-9.246v-84.168c0-12.556,3.683-55.021-32.813-55.021c-28.309,0-34.051,29.066-35.204,42.11v97.079 c0,5.106-4.139,9.246-9.246,9.246h-44.426c-5.106,0-9.246-4.14-9.246-9.246V149.593c0-5.106,4.14-9.246,9.246-9.246h44.426 c5.106,0,9.246,4.14,9.246,9.246v15.655c10.497-15.753,26.097-27.912,59.312-27.912c73.552,0,73.131,68.716,73.131,106.472 L341.91,330.654L341.91,330.654z"/><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g></svg>';


        var gplusIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 13 13"><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><path d="M3.57,10.26l-.44,0a6.14,6.14,0,0,0-2,.31,2.9,2.9,0,0,0-1.1.63v1.14A.69.69,0,0,0,.68,13h5a1.15,1.15,0,0,0,0-.19,1.84,1.84,0,0,0-.5-1.25A10.77,10.77,0,0,0,3.57,10.26ZM2.82,7.12a1.79,1.79,0,0,0,1.31-.54,1.87,1.87,0,0,0,.49-1.41A4.59,4.59,0,0,0,4,2.87,2,2,0,0,0,2.18,1.66a1.55,1.55,0,0,0-1.49.8A2.37,2.37,0,0,0,.4,3.68,4.4,4.4,0,0,0,1,5.89,2.08,2.08,0,0,0,2.82,7.12ZM12.32,0H.68A.69.69,0,0,0,0,.68V2A5.26,5.26,0,0,1,3.4,1h4L6.15,1.7H5A3.26,3.26,0,0,1,6.32,4.26a2.86,2.86,0,0,1-.5,1.67A6.15,6.15,0,0,1,4.7,7a1.45,1.45,0,0,0-.55,1,1.08,1.08,0,0,0,.51.83l.69.54A4.9,4.9,0,0,1,6.5,10.45,2.75,2.75,0,0,1,7,12.05a3,3,0,0,1-.15.95h5.49a.69.69,0,0,0,.68-.68V.68A.69.69,0,0,0,12.32,0Zm-.61,3.94H10.07V5.41H9.35V3.94H7.79V3.19H9.35V1.72h.72V3.19h1.64ZM2.33,8.41a2,2,0,0,1,.2-.74H1.91A3.31,3.31,0,0,1,0,7.12v3.11A10.91,10.91,0,0,1,2.91,9.7,2.28,2.28,0,0,1,2.33,8.41Z" style="fill:#fff;opacity:0.5"/></g></g></svg>';

        var redditIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 13 13"><title>reddit</title><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><g style="opacity:0.5"><path d="M5,11.38a.73.73,0,0,0-.3,0,.45.45,0,0,0-.28.26h.91a2,2,0,0,1-.2-.31Z" style="fill:#fff"/><path d="M8.37,9.85A1.27,1.27,0,0,0,8.73,9a1.41,1.41,0,0,0-.25-1A7.57,7.57,0,0,1,8.37,9.85Z" style="fill:#fff"/><path d="M3.37,3.72A.49.49,0,0,0,3,3.87a.47.47,0,0,0-.07.54,2.79,2.79,0,0,1,.53-.68Z" style="fill:#fff"/><path d="M7.83,11.4l-.19.29h.91v0l0,0A.65.65,0,0,0,7.83,11.4Z" style="fill:#fff"/><path d="M7.88,7.61a5.1,5.1,0,0,1-1,.16,5.15,5.15,0,0,1-1.84-.16c0,.31,0,.59-.06.79a6.11,6.11,0,0,0,.38,2.28,2.32,2.32,0,0,0,.59.91.29.29,0,0,0,.25.1h.43A.34.34,0,0,0,7,11.55l.19-.21a3,3,0,0,0,.37-.71A6.36,6.36,0,0,0,7.88,7.61Z" style="fill:#fff"/><path d="M4.48,8.08a1.46,1.46,0,0,0-.23,1,1.25,1.25,0,0,0,.34.72A6.76,6.76,0,0,1,4.48,9C4.47,8.68,4.47,8.4,4.48,8.08Z" style="fill:#fff"/><path d="M11.92,0H1.08A1.09,1.09,0,0,0,0,1.08V11.92A1.09,1.09,0,0,0,1.08,13H11.92A1.09,1.09,0,0,0,13,11.92V1.08A1.09,1.09,0,0,0,11.92,0ZM10.24,5l-.15,0h.13a1.87,1.87,0,0,1-.44,1.38,3.12,3.12,0,0,1-1.21.9l.18.15a2,2,0,0,1,.36,2.26,1.57,1.57,0,0,1-.94.85c0,.06,0,.13-.07.2a2.09,2.09,0,0,1,.46.12A.94.94,0,0,1,9.11,12a.3.3,0,0,1-.31.24H4.19A.3.3,0,0,1,3.86,12a.94.94,0,0,1,.55-1,1.72,1.72,0,0,1,.45-.13,1.18,1.18,0,0,0-.07-.2A1.68,1.68,0,0,1,3.71,9.25,1.88,1.88,0,0,1,4,7.88a1.39,1.39,0,0,1,.45-.51L4,7.16a2.68,2.68,0,0,1-1.07-1.1,1.73,1.73,0,0,1-.18-1l.07-.13L2.74,5A1,1,0,0,1,4,3.35a5,5,0,0,1,2.31-.64c.18-.54.35-1.06.52-1.59a.3.3,0,0,1,.4-.23L7.56,1l.92.22a.87.87,0,0,1,1-.42.86.86,0,0,1,.67.79.89.89,0,0,1-.57.9.85.85,0,0,1-.76-.08.85.85,0,0,1-.42-.65L7.28,1.49c-.06.21-.13.41-.2.62v.05c-.05.14-.09.29-.14.43l0,.13c.19,0,.4,0,.6.08A4.46,4.46,0,0,1,9,3.36a1.07,1.07,0,0,1,1.22,0,1,1,0,0,1,.45.85A1,1,0,0,1,10.24,5Z" style="fill:#fff"/><path d="M9.5,3.74a2.32,2.32,0,0,1,.54.7.45.45,0,0,0,0-.54A.47.47,0,0,0,9.5,3.74Z" style="fill:#fff"/><path d="M8.69,3.83a4.1,4.1,0,0,0-2-.56h0A5,5,0,0,0,5,3.52a2.82,2.82,0,0,0-1.32.86A1.34,1.34,0,0,0,3.79,6.3,3,3,0,0,0,4.89,7,4.76,4.76,0,0,0,8,7a2.55,2.55,0,0,0,1.4-1,1.23,1.23,0,0,0,.19-1.06A1.87,1.87,0,0,0,8.69,3.83ZM4.8,5.3a.71.71,0,0,1-.21-.49.73.73,0,0,1,.21-.49.72.72,0,0,1,.48-.2h0A.7.7,0,0,1,6,4.8a.71.71,0,0,1-.2.49.71.71,0,0,1-.49.21h0A.67.67,0,0,1,4.8,5.3ZM7.86,6.53A1.6,1.6,0,0,1,7,6.9a2.74,2.74,0,0,1-.49,0h0a2.4,2.4,0,0,1-1-.18,1.08,1.08,0,0,1-.37-.26.27.27,0,0,1,0-.39A.28.28,0,0,1,5.3,6h0a.28.28,0,0,1,.19.07,1.22,1.22,0,0,0,.85.29,2.21,2.21,0,0,0,.83-.09.63.63,0,0,0,.31-.17.28.28,0,0,1,.42,0A.29.29,0,0,1,7.86,6.53Zm.35-1.24a.69.69,0,0,1-.49.21h0A.68.68,0,0,1,7,4.81a.69.69,0,0,1,.67-.69h0a.67.67,0,0,1,.48.2.7.7,0,0,1,.21.48A.71.71,0,0,1,8.21,5.29Z" style="fill:#fff"/><path d="M9.25,2a.31.31,0,0,0,.32-.31.33.33,0,0,0-.65,0A.36.36,0,0,0,9,1.86.34.34,0,0,0,9.25,2Z" style="fill:#fff"/></g></g></g></svg>';

        var tumblrIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 13 13"><title>tumblr</title><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><path d="M11.92,0H1.08A1.09,1.09,0,0,0,0,1.08V11.92A1.09,1.09,0,0,0,1.08,13H11.92A1.09,1.09,0,0,0,13,11.92V1.08A1.09,1.09,0,0,0,11.92,0ZM7.44,11.18c-2,0-2.19-1.43-2.19-2.5V5.56H3.69V4.32c1.87-.63,1.78-1.47,1.87-2.19V1.82H7.12v2.5H9V5.56H7.12V8.68a.94.94,0,0,0,.94.94A1.23,1.23,0,0,0,9,9.31l.31,1.25A3.23,3.23,0,0,1,7.44,11.18Z" style="fill:#fff;opacity:0.5"/></g></g></svg>';

        var pinterstIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 13 13"><title>pinterest</title><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><path d="M11.92,0H1.08A1.09,1.09,0,0,0,0,1.08V11.92A1.09,1.09,0,0,0,1.08,13H11.92A1.09,1.09,0,0,0,13,11.92V1.08A1.09,1.09,0,0,0,11.92,0ZM7.14,8.7a2.66,2.66,0,0,1-1.31-.62c-.26,1.34-.57,2.63-1.5,3.3-.29-2,.42-3.55.75-5.17-.56-1,.06-2.84,1.24-2.38,1.46.58-1.25,3.51.57,3.87S9.56,4.41,8.38,3.21c-1.7-1.73-5,0-4.55,2.43.1.61.72.79.25,1.62C3,7,2.66,6.16,2.71,5A3.66,3.66,0,0,1,6,1.65c2.05-.23,4,.75,4.24,2.68C10.55,6.51,9.33,8.87,7.14,8.7Z" style="fill:#fff;opacity:0.5"/></g></g></svg>';


        vSignInSpecificTime = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12.35 8.83"><title>Specific time</title><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><g id="check"><path d="M12.14,1.24,4.92,8.51l-.09.1a.72.72,0,0,1-1,0L.22,5a.72.72,0,0,1,0-1,.72.72,0,0,1,1,0L4.31,7.07,11.12.22a.72.72,0,0,1,1,0A.73.73,0,0,1,12.14,1.24Z" style="fill:#fff"/><path d="M11.12.21,4.31,7.06,1.24,4a.74.74,0,0,0-1,0,.74.74,0,0,0,0,1L3.8,8.61a.72.72,0,0,0,1,0l.08-.1,7.23-7.27a.74.74,0,0,0,0-1A.72.72,0,0,0,11.12.21Z" style="fill:#fff"/></g></g></g></svg>';



      var embedCodeValue = ' &lt;iframe width=&quot;795&quot; height=&quot;515&quot; frameborder=&quot;0&quot; src=&quot;'+info['meta']['embedLink']+'&quot;  allowfullscreen=&quot;true&quot;&gt;&lt;/iframe&gt;';


        var seriesContentArray =  Array();
        if(info['inCourse'])
        {
            for(var i =0 ; i < info['all_fleeqs_in_course'].length ; i++)
            {

                var sec = info['all_fleeqs_in_course'][i]['duration']/1000;
                var newArr = [info['all_fleeqs_in_course'][i]['display_name'] , toClockTimer(Math.ceil(sec)) ,  info['all_fleeqs_in_course'][i]['code_key']  ];
                seriesContentArray.push(newArr);

            }
        }





        var innerSeriesPopupContent = '';

        for (var i =0 ; i < seriesContentArray.length; i++)
        {

            var currentItemIsSet = '';
            if(seriesContentArray[i][2] == curr_code_key)
            {
                currentItemIsSet = 'current';
            }

            innerSeriesPopupContent = innerSeriesPopupContent+
                            '<div class="series-item '+currentItemIsSet+'" data-fleeq-entry="'+seriesContentArray[i][2]+'"' +
                                            'data-index-value="'+parseInt(i+1)+'">' +
                                        '<span class="series-item-numbering" >'+parseInt(i+1)+'.</span>' +
                                        '<span class="series-item-name" >'+seriesContentArray[i][0]+'</span>' +
                                        '<span class="series-item-time">('+seriesContentArray[i][1]+')</span>' +
                            '</div>';
        }




        var innerStepsControlContent = '<div class="left-steps-section">';
        var currPosForSteps = 0;
        for (var i = 0; i < info['steps'].length ; i++)
        {

            var currImage = info['full_thumbnail_image'];


            var currContent =  '';
            var currContentHide = 'hide';

            if(info['steps'][i]['content'] && (info['steps'][i]['content'].length > 0))
            {
                currContent = info['steps'][i]['content'];
                currContent = ellipse(currContent, 85);
                currContentHide = '';
            }


            var currStartImageCrop = 75*i*(-1);

            var positionOnTimeline = (currPosForSteps/1000);
            innerStepsControlContent =  innerStepsControlContent+'<div class="step-entry" data-screen-num="'+i+'" data-time-in="'+positionOnTimeline+'">' +
                                                                        '<div class="step-entry-numbering">'+parseInt(i+1)+'.</div>' +
                                                                        '<div class="step-entry-timeline-pos">('+
                                                                            toClockTimer(positionOnTimeline)+
                                                                        ')</div>' +
                                                                        '<div class="step-entry-thumbnail crop" >' +
                                                                            '<img src="'+currImage+'"' +
                                                                                ' style="width:100px; height: auto;margin-top:'+currStartImageCrop+'px">' +
                                                                        '</div>' +
                                                                        '<div class="step-entry-content '+currContentHide+'">'+currContent+'</div>' +
                                                                    '</div>';
            currPosForSteps = currPosForSteps+info['steps'][i]['duration_f']+_fleeqPlayer.transitionTiming;

        }

        innerStepsControlContent =innerStepsControlContent+'</div>';


        var rightTopInfo = '<div class="rightTopInfo"></div>';





        var seriesHTMLContent = '<div class="seriesContent"><div class="series-popup-title">Playlist</div><div class="series-item-list">'+innerSeriesPopupContent+'</div></div>';

        var socialPopupShare = '<div class="cher-popup-wrapper large"><div class="cher-popup">' +
                                    '<div class="share-close-button">'+deleteSVG+'</div>' +
                                    '<div class="share-title"></div>' +
                                    '<div class="url-share">' +
                                            '<div class="url-share-title">  Share  </div>' +
                                            '<div class="url-share-wrapper row">' +
                                                '<div class="url-share-general col-md-1 col-sm-1 col-xs-1"> Link  </div>' +
                                                '<div class="url-share-specific col-md-9 col-sm-9 col-xs-9"> ' +
                                                    '<span class="url-value" id="url-value-id">'+info['meta']['shareLink']+'</span> ' +
                                                '</div>' +
                                                '<div class="url-share-copy col-md-1 col-sm-1 col-xs-1" id="copyLinkId"> Copy  </div>' +
                                            '</div>'+
                                    '</div>' +
                                    '<div class="embed-share row">' +
                                                '<div class="embed-share-title col-md-1 col-sm-1 col-xs-1"> Embed</div>' +
                                            '<div class="embed-share-input col-md-9 col-sm-9 col-xs-9">' +
                                               '<input type="text" value="'+embedCodeValue+'" readonly="" spellcheck="false" id="embed-value-id">' +
                                            '</div>' +
                                            '<div class="embed-share-copy col-md-1 col-sm-1 col-xs-1" id="copyEmbedId"> Copy  </div>' +
                                    '</div>' +
                                    '<div class="cocial-share">' +
                                        '<div class="cocial-share-title">Social share</div>' +
                                            '<div class="cocial-share-wrapper row">' +
                                                '<div class="social-icon-share cocial-share-facebook">'+fbIcon+'</div>' +
                                                '<div class="social-icon-share cocial-share-twitter">'+twitterIcon+'</div>' +
                                                '<div class="social-icon-share cocial-share-linkedin">'+linkedinIcon+'</div>' +
                                                '<div class="social-icon-share cocial-share-tumblr">'+tumblrIcon+'</div>' +
                                                '<div class="social-icon-share cocial-share-pintrest">'+pinterstIcon+'</div>' +
                                                '<div class="social-icon-share cocial-share-reddit">'+redditIcon    +'</div>' +
                                            '</div>' +
                                        '</div>' +
                                    '</div>' +
                                '</div></div>';




        var socialPopupShareSmall = '<div class="cher-popup-wrapper small">' +
                                    '<div class="cher-popup">' +
                                             '<div class="share-close-button">'+deleteSVG+'</div>' +
                                             '<div class="share-title"></div>' +
                                             '<div class="url-share">' +
                                                 '<div class="url-share-title">  Share  </div>' +
                                                 '<div class="url-share-wrapper row">' +
                                                    '<div class="url-share-specific col-md-12 col-sm-12 col-xs-12"> ' +
                                                       '<span class="url-value" id="url-value-id">'+info['meta']['shareLink']+'</span> ' +
                                                    '</div>' +
                                                    '<div class="url-share-copy col-md-12 col-sm-12 col-xs-12 text-center" id="copyLinkId"> Copy  </div>' +
                                                 '</div>'+
                                             '</div>' +
                                            '<div class="cocial-share">' +
                                                '<div class="cocial-share-title">Social share</div>' +
                                                '<div class="cocial-share-wrapper row">' +
                                                '<div class="cocial-share-facebook">'+fbIcon+'</div>' +
                                                '<div class="cocial-share-twitter">'+twitterIcon+'</div>' +
                                                '<div class="cocial-share-linkedin">'+linkedinIcon+'</div>' +
                                            '</div>' +
                                   '</div>' +
                              '</div>';
        


        var currScreen =  _fleeqPlayer.currentScreen;
        var numOfScreens =  _fleeqPlayer.numberOfScreens;




         if(isMobileDevice)
        {
            var ta = 'center';
            if(isInIframe)
            {
                ta = 'left';
            }

            topIndidDiv ='<div class="displayIndication" ><div style="position: relative; text-align: '+ta+'; margin-left: 0px;">' +

            '<div class=" truncate controls" style="display:inline-block"> '+displayName+'</div>' +
            '<div class="steps-indication hide" style="display:inline-block; vertical-align: top;"> - <span  class="currScreenIndication">'+currScreen+'</span>/<span  class="outOfScreens">'+numOfScreens+'</span></div></div>' +
                '<div>';



            stepsControl = '<div class="steps-control" >' +
                '<a  >' +
                stepsSVG +
                '</a>' +
                '</div>';



            captionsIndication = '<div class="cc-control isMobile " >' +
                '<a  onclick="toggleCaptionsB()">' +
                captionsSvg +
                '</a>' +
                '</div>';



            var soundBar = '<div class="bar-sound-setting"><div class="inner-bar" >' +
                             '<div class="inner-bar-full-bg" style="background-color: '+grad_A+'"></div>' +
                             '<div class="inner-bar-full" style="background-color: '+grad_A+'"></div>' +
                             '<div class="inner-bar-full-top" style="background-color: '+grad_A+'"></div>' +
                            '</div>'


            if(narration == '0')
            {
                soundBar = '';
                volumeButtonSvg = muteFullButtonSvg;
            }

            soundAndvol = '<div class="sound-status isMobile " >' +
            '<a  onclick="clickOnVolume()" class="changeVolume">' +
            volumeButtonSvg +
            '</a>' +
            '</div>'+
                soundBar+
            '</div>';



            fullScreenIcon = '<div class="allFullScreenDiv isMobile" >' +
                '<a  onclick="pauseAndOpenFullScreen()">' +
                allowFullScreen +
                '</a>' +
                '</div>';


            attributionInControls = '<div class="attribution-control" >' +
                '<a  onclick="goToAttributionReferal()">' +
                logoSVG +
                '</a>' +
                '</div>';


            languageControl = '<span class="language-control" >' +
                '<a  ">' +
                '<span class="twoLettersLangCode" style="color: '+grad_A+'"></span>' +
                '</a>' +
                '</div>';


            seriesControl = '<div class="series-control" >' +
                '<a  >' +
                seriesSVG +
                '</a>' +
                '</div>';


            socialControl = '<div class="social-control" >' +
                '<a  onclick="launchSharePopup()">' +
                socialSVG +
                '</a>' +
                '</div>';



            logoRightBottom  = '';
            if(typeof info['logo_final_url'] !== 'undefined')
            {
                var logoPosition = (info['info']['is_logo_rtl'] === 1? "logo-right-bottom" : "logo-left-bottom");
                logoRightBottom = '<div class="team-logo '+logoPosition+'" >' +

                    '<div class="logo-follow">' +
                    '<img class="brand-image" src="'+info['logo_final_url']+'">'+
                    '</div>' +
                    '</div>';
            }









            var liveThumbnailDiv = '<div class="live-thumbnail">' +
                                        '<div class="step-entry-thumbnail crop">' +
                                            '<img src="'+info["full_thumbnail_image"]+'" style="width:100px;height: auto;">' +
                                            '<div class="timer-on-th"></div>' +
                                        '</div>' +
                                    '</div>';


            var listOfLanguages = '';

            // var langs = [
            //     ["English", "zzz"],
            //     ["Spanish", "zzz"],
            //     ["French", "zzz"],
            // ];

            var langs = Array();




            var langTowChars = false;

            if(info['w_localization'] && !hideLocalization)
            {


                var currKeysRoot = false;


                if(info['localization_source'])
                    currKeysRoot = info['localization_source'];
                else
                    currKeysRoot = info['localization'];


                var currKeys = Object.keys(currKeysRoot['languages']);
                for (var i =0 ; i < currKeys.length; i++)
                {

                    var isCurrent = false;

                    if(!info['info']['localize_language'] && (currKeysRoot['languages'][currKeys[i]]['lID'] == currKeysRoot['defaultLanguageID']))
                    {
                        isCurrent = true;
                        langTowChars = currKeysRoot['languages'][currKeys[i]]['code'];
                    }
                    else
                    {
                        if(currKeysRoot['languages'][currKeys[i]]['lID'] == info['info']['localize_language'])
                        {
                            isCurrent = true;
                            langTowChars = currKeysRoot['languages'][currKeys[i]]['code'];
                        }
                    }




                    var name = currKeysRoot['languages'][currKeys[i]]['name'];
                    var code_key = currKeysRoot['languages'][currKeys[i]]['code_key'];
                    var newArr = [name , code_key , isCurrent ];
                    langs.push(newArr);
                }



            }




            for(var i = 0 ; i <langs.length ; i++)
            {

                var currentLang = ''
                if(langs[i][2])
                {
                    currentLang = 'current'
                }

                listOfLanguages = listOfLanguages + '<div class="lang-list-item" >' +
                                                            '<span class="'+currentLang+'" data-fleeq-entry="'+langs[i][1]+'">'+langs[i][0]+'</span>' +
                                                    '</div>';
            }




            var capOnIndication = 'current';
            var capOffIndication = '';

            localizationTooltip = '<div class="tooltipController">' +
                                        '<div class="cc-sections-sep"></div>' +
                                        '<div class="languages-section">' +
                                            '<div class="languages-section-title">Languages</div>'+
                                            listOfLanguages+
                                        '</div>' +

                                    '</div>';


            var inFrame = '';
            var underHover = '';
            if(isInIframe)
            {
                inFrame = 'inFrame';
                underHover = '<div class="underHover"></div>';
            }




            var firePrev = '<div class="pevious-dir" onclick="mobilePrev()"><a   >'+peviousButtonSvg+'</a></div>';
            var fireNext = '<div class="next-dir" onclick="mobileNext(false)"><a  >'+nextButtonSvg+'</a></div>';
            // if(narration == '0')
            // {
            //     firePrev = '<div class="pevious-dir" onclick="fireKey(this, 37)""><a href="#"  >'+peviousButtonSvg+'</a></div>';
            //     fireNext = '<div class="next-dir" onclick="fireKey(this, 39)"><a href="#"  >'+nextButtonSvg+'</a></div>';
            // }
            if(isInIframe) {
                 firePrev = '<div class="pevious-dir"><a  onclick="fireKey(this, 37)" >'+peviousButtonSvg+'</a></div>';
                 fireNext = '<div class="next-dir"><a  onclick="fireKey(this, 39)" >'+nextButtonSvg+'</a></div>';
            }


            var timeClock = '<div class="timeClock">00:00</div>';


            if(realMobile)
                stepsControl = '';

            vidDiv ='<div class="bottom-vid-drawer isMobile '+inFrame+'" style="opacity: 0; width: '+mobileScreenWidth+'px; position: absolute;">' +
                stepsControl+
                // firePrev +
                '<div class="playThis-dir">' +
                '<a  onclick="playPauseToggle()">' +  pauseButtonSvg + playButtonSvg +'</a>'+
                '</div>' +
                // fireNext +
                timeClock +
                // underHover+
                '</div>';

            //var wrapper= document.createElement('div');
            //wrapper.innerHTML= topIndidDiv;
            //var divNew = wrapper.firstChild;
            //var mainBG = document.getElementById('single-quote');
            //mainBG.insertBefore(divNew , mainBG.childNodes[0]);
            // $('#single-quote').prepend(topIndidDiv);
            // $('#single-quote').prepend('<div class="loaderaudioWave"></div>');

            if(window.name == 'courseFrame')
            {
                $('.truncate.controls').hide();
                $('#single-quote').css('top','-50px');
            }





            var wrapper= document.createElement('div');
            wrapper.innerHTML= vidDiv;
            var divNew = wrapper.firstChild;
            if(isInIframe && !isGif){
                var mainBG = document.getElementById('ec_exp');
                mainBG.insertBefore(divNew, mainBG.childNodes[0]);

                $('.bottom-vid-drawer.isMobile.inFrame').css({'z-index' :'100001'});


                $('#single-quote').css({'vertical-align' :'top'});
                $('#single-quote').css({'text-align' :'left'});


            }
            else {
                // var mainBG = document.getElementById('single-quote');
                // mainBG.insertBefore(divNew, mainBG.childNodes[3]);
            }




            // if(!isInIframe && isMobileDevice) {
            //     mainBG = document.getElementById('modal-content');
            //     mainBG.insertBefore(divNew, mainBG.childNodes[3]);
            // }


            if(isInIframe)
            {

                if(info['info']['enable_chat'] == 1){
                    $('.bottom-vid-drawer').append('<div id="fleeq-chat-launcher">' +
                        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="57px" height="61px" viewBox="0 0 57 61" version="1.1">'+
                        '<defs>'+
                        '<filter x="-24.5%" y="-25.0%" width="149.0%" height="150.0%" filterUnits="objectBoundingBox" id="filter-1">'+
                        '<feOffset dx="0" dy="2" in="SourceAlpha" result="shadowOffsetOuter1"/>'+
                        '<feGaussianBlur stdDeviation="2" in="shadowOffsetOuter1" result="shadowBlurOuter1"/>'+
                        '<feColorMatrix values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.5 0" type="matrix" in="shadowBlurOuter1" result="shadowMatrixOuter1"/>'+
                        '<feMerge>'+
                        '<feMergeNode in="shadowMatrixOuter1"/>'+
                        '<feMergeNode in="SourceGraphic"/>'+
                        '</feMerge>'+
                        '</filter>'+
                        '</defs>'+
                        '<g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">'+
                        '<g id="Artboard" transform="translate(-28.000000, -8.000000)">'+
                        '<g id="bubble" transform="translate(29.000000, 9.000000)">'+
                        '<g id="Group" filter="url(#filter-1)" transform="translate(4.000000, 6.000000)">'+
                        '<rect id="Rectangle" fill="'+grad_A+'" fill-rule="nonzero" x="0" y="0" width="48" height="41" rx="5"/>'+
                        '<path d="M46,5.217 L46,36.078 C46,37.851 44.542,39.295 42.75,39.295 L40.944,39.295 L38.806,39.295 L38.949,41.428 C39.006,42.287 39.353,39.721 39,40.5 C38.377,39.136 36.94,41.025 35.537,39.792 L34.972,39.295 L34.218,39.295 L5.25,39.295 C3.458,39.295 2,37.852 2,36.078 L2,5.217 C2,3.443 3.458,2 5.25,2 L42.75,2 C44.542,2 46,3.443 46,5.217 Z M5.25,0 C2.363,0 0,2.348 0,5.217 L0,36.078 C0,38.945 2.363,41.295 5.25,41.295 L34.218,41.295 C37.167,43.885 37.687,48 37.687,48 C40.589,45.637 41.062,43.055 40.945,41.295 L42.751,41.295 C45.639,41.295 48.001,38.945 48.001,36.078 L48.001,5.217 C48,2.348 45.638,0 42.75,0 L5.25,0 Z" id="Shape" fill="'+grad_A+'" fill-rule="nonzero"/>'+
                        '<path d="M39.59,16.972 L8.41,16.972" id="Path" stroke="#FFFFFF" stroke-width="2"/>'+
                        '<path d="M39.59,23.468 L8.41,23.468" id="Path" stroke="#FFFFFF" stroke-width="2"/>'+
                        '<path d="M39.59,29.963 L21.466,29.963" id="Path" stroke="#FFFFFF" stroke-width="2"/>'+
                        '<path d="M39.59,10.477 L8.41,10.477" id="Path" stroke="#FFFFFF" stroke-width="2"/>'+
                        '</g>'+
                        '<circle id="fcl-notification" stroke="#FD0C0C" fill="#E20808" fill-rule="nonzero" cx="7" cy="7" r="7"/>'+
                        '</g>'+
                        '</g>'+
                        '</g>'+
                        '</svg>'+
                        '</div>');
                    var style = document.createElement('style');
                    style.innerHTML =
                        '#__talkjs_launcher {' +
                        'background-color: '+grad_A+';' +
                        '}';
                    var ref = document.querySelector('script');
                    ref.parentNode.insertBefore(style, ref);
                }

                if(!realMobile)
                    $('.bottom-vid-drawer').prepend(fullScreenIcon);


                if(info['f_attr'] == 1)
                    $('.bottom-vid-drawer').prepend(attributionInControls);

                if(!realMobile)
                    $('.bottom-vid-drawer').append(soundAndvol);



                $('.modal.ec').append('<div id="flow-options" data-ctas="0">' +
                    '<div class="flow-content">' +
                        '<div class="flow-cta" data-index="0"></div>' +
                        '<div class="flow-cta" data-index="1"></div>' +
                        '<div class="flow-cta" data-index="2"></div>' +
                        '<div class="sbs-content">' +
                            '<div class="sbs-cta lastStep">' +
                                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 31.26 21.04"><title>Previous step</title><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><path d="M30.19.1,18.41,6.9V.71A.71.71,0,0,0,17.34.1L.36,9.9a.71.71,0,0,0,0,1.23l17,9.81a.71.71,0,0,0,1.07-.61V14.14l11.78,6.8a.72.72,0,0,0,1.07-.61V.71A.71.71,0,0,0,30.19.1Z" style="fill:#fff"/></g></g></svg>' +
                            '</div>'+
                            '<div class="sbs-cta nextStep">' +
                                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18.26 20.87"><title>Next step</title><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><path d="M17.91,9.83,1.06.1A.7.7,0,0,0,0,.71V20.17a.71.71,0,0,0,1.06.61l16.85-9.73A.7.7,0,0,0,17.91,9.83Z" style="fill:#fff"/></g></g></svg>'+
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>');


                var shareData = info['info']['sharing_data'];
                if(shareData['enabled'])
                {
                    $('.top-right-item.share').append(socialControl);





                    $('.modal.ec').append(socialPopupShare);
                    $('.modal.ec').append(socialPopupShareSmall);
                    if(currTimeInSeconds() == 0)
                    {
                        $('.url-share-specific-infleeq-spot').css('display','none');
                    }
                    var copyLinkButton = document.getElementById("copyLinkId");
                    var copyEmbedButton = document.getElementById("copyEmbedId");
                    if(copyLinkButton){
                        copyLinkButton.addEventListener("click", function() {
                            copyToClipboardWrapper( document.getElementById("copyLinkId")  , document.getElementById("url-value-id"))
                        });
                    }

                    if(copyEmbedButton){
                        copyEmbedButton.addEventListener("click", function() {
                            copyToClipboardWrapper( document.getElementById("copyEmbedId")  , document.getElementById("embed-value-id"))
                        });
                    }
                }



                if((info['info']['enable_captions'] == 1) && (info['info']['captions_toggle'] == 1)) {
                    $('.bottom-vid-drawer').append(captionsIndication);
                }
                if(info['w_localization'] && !hideLocalization)
                {
                    $('.bottom-vid-drawer').append(languageControl);
                    $('.bottom-vid-drawer').append(localizationTooltip);
                    $('.cc-sections-sep').css('height',$('.tooltipController').height()+'px');
                    $('.twoLettersLangCode').html(langTowChars.toUpperCase());
                }





                if(info['inCourse'])
                {
                    $('.top-right-item.series').append(seriesControl);
                    $('.top-right-items').append(seriesHTMLContent);



                }


                if(!realMobile)
                    $('.bottom-vid-drawer').append(liveThumbnailDiv);




                $('.bottom-vid-drawer').append(innerStepsControlContent);


                // $(".allFullScreenDiv").addClass('pull-right');
                // $(".sound-status").addClass('pull-right');
                $(".allFullScreenDiv").css('float', 'right');
                $(".sound-status").css('float', 'right');

                $(".next-dir svg").css('left', '-5px');
                $(".next-dir svg").css('top', '0px');




                // $('.displayInfoSection').css('right',$('.top-right-items').width()+'px');
                if(info['info']['show_logo_on_fleeq'])
                    $('#main-content').append(logoRightBottom);



                if(typeof  $('.inner-bar').offset() !== 'undefined')
                {
                    $('.inner-bar-full-top').draggable({
                        axis: "y",
                        containment: "parent",
                        drag: function( event, ui ) {
                            var currOffset =  ui.position.top;
                            setVolumeVisualBar(currOffset);
                            setVolume(parseFloat((65-currOffset)/65) );
                        },
                        start: function( event, ui ) { VolumeInDragMode = true; },
                        stop: function( event, ui ) {
                            VolumeInDragMode = false;
                            if( pendingMouseLeaveSoundBar)
                            {
                                pendingMouseLeaveSoundBar = false;
                                removeVolumeBar();
                            }
                        }

                    });
                }



                sizeFAQ();
            }


        }
        else
        {
            var wrapper= document.createElement('div');
            wrapper.innerHTML= vidDiv;
            var divNew = wrapper.firstChild;
            var mainBG = document.getElementById('main-content');
            mainBG.insertBefore(divNew , mainBG.childNodes[3]);
        }



         $('.bottom-vid-drawer').css('opacity','1');




            if(isMobileDevice)
            {
                $('.modal.ec').prepend(vidTimeLine);
            }
            else
            {
                $('#main-content').prepend(vidTimeLine);
            }


        var textForNoNar = "No narration";
        if(isMobileDevice && !isInIframe)
        {
            textForNoNar = "Narration is disabled on mobile";
        }

        $('#modal-content').append('<div class="noNarration">'+textForNoNar+'</div>')

        if(isMobileDevice)
        {
             $('#modal-content').addClass('isMobile');
        }
    }



    $(document).on('click', '.cocial-share-twitter', function (e) {
       var message =" Check out this fleeq: "+displayName;
       var link = "https://twitter.com/intent/tweet?text="+encodeURI(message);
       link =link+'&url='+encodeURI(getCurrentURLtoShare());
        window.open(link, "pop", "width=600, height=400, scrollbars=no");
    })



    $(document).on('click', '.cocial-share-facebook', function (e) {
        var link = "https://www.facebook.com/sharer/sharer.php?u=";
        window.open("https://www.facebook.com/sharer/sharer.php?u="+getCurrentURLtoShare(), "pop", "width=600, height=400, scrollbars=no");

    })


    $(document).on('click', '.cocial-share-linkedin', function (e) {
        var link = 'https://www.linkedin.com/shareArticle?mini=true&url='+getCurrentURLtoShare()+'title='+displayName+'&summary='+encodeURI(displayName);
        window.open(link, "pop", "width=600, height=400, scrollbars=no");

    })

    $(document).on('click', '.cocial-share-google-plus', function (e) {
        var link = 'https://plus.google.com/share?url='+encodeURI(getCurrentURLtoShare());
        window.open(link, "pop", "width=600, height=400, scrollbars=no");

    })

    $(document).on('click', '.cocial-share-tumblr', function (e) {
        var link = 'http://tumblr.com/widgets/share/tool?canonicalUrl='+encodeURI(getCurrentURLtoShare());
        window.open(link, "pop", "width=600, height=400, scrollbars=no");

    })

    $(document).on('click', '.cocial-share-pintrest', function (e) {
        var link = 'http://pinterest.com/pin/create/button/?url='+encodeURI(getCurrentURLtoShare())+
            '&media='+encodeURI(getLiveThumbnailToShare())+'&description='+encodeURI(displayName);
        window.open(link, "pop", "width=600, height=400, scrollbars=no");

    })


    $(document).on('click', '.cocial-share-reddit', function (e) {
        var link = 'http://www.reddit.com/submit?url='+encodeURI(getCurrentURLtoShare())+'&title='+encodeURI(displayName);
        window.open(link, "pop", "width=600, height=400, scrollbars=no");

    })











    function setVolumeVisualBar(currOffset)
    {
        $('.bottom-vid-drawer.isMobile.inFrame .bar-sound-setting .inner-bar-full').css('height', (73 - currOffset)+'px');
        $('.bottom-vid-drawer.isMobile.inFrame .bar-sound-setting .inner-bar-full').css('margin-top', currOffset+'px');
    }







    function mobileNext(restartGuide)
    {




        if(restartGuide)
        {
            jumpToScreen(0, true);
            $('.fullOverPost').fadeOut('fast', function(){

                $('.fullOverPost').remove();

                setTimeout(function(){

                }, 0)

            })

            jumpToScreen(0, true);


            if(narration == '1')
            {

                volumeOff = false;






                document.querySelector(".bottom-vid-drawer.isMobile").style.setProperty('opacity', 1, 'important');
                if(!realMobile)
                {
                    currAudio = fullNarrationAudioSteps[0];
                    currAudio.play();
                    currAudio.mute(false);
                    currAudio.volume(1.0);
                }






            }


            return 0;
        }


        if( $('.next-dir').hasClass('bRight'))
        {
            $('.next-dir').removeClass('bRight')
        }

        if(!canTransit)
            return

        var finalScreen = _fleeqPlayer.numberOfScreens;
        var currScreen =  _fleeqPlayer.currentScreen;

        var canPlay = true;
        if((currScreen == finalScreen) && !postSplashOn)
        {
            var canPlay = false;
                rightClicked('h');
        }



        if(splashOn) {
            removeSplash()
        } else {
            removeAllTimeOuts();
             muteAudio();
        }

        if(canPlay) {
            if(narration == '0') {
                rightClicked('h');
            } else {
                // currAudio.volume = 0;
                // currAudio.pause();
                // currAudio  = new Audio(audioFiles[currScreen]);
                // currAudio.addEventListener('ended', audioStopped);
                //currAudio.pause();


                $('#runningbg').gradientProgressBar({
                    value: 0.0

                });
                var switchTimer = setTimeout(function(){
                    $('.bottom-vid-drawer.isMobile').fadeOut(100, function() {


                        $('.loaderaudioWave').fadeIn(100);
                    })
                }, 250 )

                //
                // if(!NarrationVolumeOff)
                //     fullNarrationFile.fade(1.0,0.0, 200);
                //
                // setTimeout(function()
                //     {
                //             // fullNarrationFile.seek(getOffsetForNarrationSeek());
                //             if(!NarrationVolumeOff)
                //                 fullNarrationFile.volume(1.0);
                //             }, transitionDelay + 100 );

                rightClicked('h');

                if(typeof switchTimer !== "undefined"){
                    clearTimeout(switchTimer);
                }
                setTimeout(function() {
                    if($('.bottom-vid-drawer.isMobile').css('display') == 'none')
                    {
                        $('.loaderaudioWave').fadeOut(100, function () {

                            $('.bottom-vid-drawer.isMobile').fadeIn(100);
                        })
                    }

                }, 250 );









                if($('.playThis-dir').css('opacity') == 0)
                {
                    $('.playThis-dir').css('opacity', 1);
                }

            }

        }




        //evt.preventDefault();
        //evt.stopPropagation();


    }


    function mobilePrev()
    {







        if(!canTransit)
            return

        removeAllTimeOuts();
        // muteAudio();
        if(!splashOn) {
            leftClicked('h');


            // if(!NarrationVolumeOff)
            //     fullNarrationFile.fade(1.0,0.0, 200);
            //
            // setTimeout(function()
            // {
            //      // fullNarrationFile.seek(getOffsetForNarrationSeek());
            //     if(!NarrationVolumeOff)
            //         fullNarrationFile.volume(1.0);
            // }, transitionDelay + 100 );



            // setTimeout(function(){fullNarrationFile.seek(getOffsetForNarrationSeek());}, transitionDelay +200);




            if( $('.next-dir').hasClass('bRight'))
            {
                $('.next-dir').removeClass('bRight')
            }

            if($('.playThis-dir').css('opacity') == 0)
            {
                $('.playThis-dir').css('opacity', 1);
            }
        }
        //currAudio.pause();

        // currAudio.src = audioFiles[currScreen-1];
        // currAudio.load();
        // currAudio.onloadeddata  = function(){
        //
        //     // if(!pauseMode)
        //     if(!pauseMode)
        //         {
        //             currAudio.play();
        //
        //
        //
        //
        //         if(volumeOff)
        //             currAudio.muted = true;
        //         else
        //             currAudio.muted = false;
        //     }
        //
        // } ;

    }



    function moveToScreenFromAccord(elm)
    {

        var currScreen =  _fleeqPlayer.currentScreen;
        if(toScreen == (currScreen + 1) )
        {
            rightClicked('h');
        }
        else
        {
            if(toScreen == (currScreen - 1))
            {
                leftClicked('h');
            }
        }

    }



    var arrayOfPoints = [];


    function addPointOnTimeLine(offset, i)
    {


        var w = window.innerWidth;
        // console.log(offset);
        var actualOffset = parseFloat(offset/time)*100;
         // actualOffset = 100*Math.ceil(  actualOffset)/window.innerWidth;



        arrayOfPoints[i] = actualOffset;

        var point = '<div class="tl-el"  start-position="'+actualOffset+'"  screen-num="'+i+'" style="left:'+actualOffset+'%;"><div class="tl-line"></div><div class="tl-el-point"   screen-num="'+i+'"></div></div>';



        var wrapper= document.createElement('div');
        wrapper.innerHTML= point;
        var divNew = wrapper.firstChild;
        var mainBG = document.querySelector('.tl');
        mainBG.insertBefore(divNew , mainBG.childNodes[0]);


    }



    var currBaseTimeInFleeq = 0;
    var currStartPlayInFleeq = false;
    var currStopPlayInFleeq = false;
    var locationInStep  = 0; // would help to seek once
    var currStepInFleeq  = 0; // would help to seek once


    function initializeTimerCounter()
    {
        currBaseTimeInFleeq = 0;
        $('.tl-over-prefix').css('width','0%');
        $('.tl-over').css('width','0%');
        anime.remove('.tl-over');
        currStartPlayInFleeq = false;
        currStopPlayInFleeq = false;

    }










    function startTimerCounter()
    {
        // var d = new Date();
        // currStartPlayInFleeq = d.getTime();
        //
        // var percentageValLeft = 100*((time-currBaseTimeInFleeq)/time);
        // var timeLeft = time-currBaseTimeInFleeq;
        //
        //
        // console.log("percentageValLeft: "+percentageValLeft);
        //
        //
        //
        // // setPrefixOnTimeLine();
        //
        // $('.tl-over').css('opacity','1');
        //
        //
        // tlOverAnimPtr = anime({
        //     targets: '.tl-over',
        //     width: percentageValLeft+'%',
        //     duration: timeLeft,
        //     easing: 'linear',
        //     complete: function(){
        //
        //     },
        //     update: function(anim) {
        //         console.log(anim.currentTime + 'ms'); // Get current animation time with `myAnimation.currentTime`, return value in ms.
        //         console.log(anim.progress + '%'); // Get current animation progress with `myAnimation.progress`, return value in %
        //     }
        // })

    }

    function setPrefixOnTimeLine()
    {

        var percentageVal = 100*currBaseTimeInFleeq/time;
        $('.tl-over-prefix').css('width',percentageVal+'%');
    }



    function getStepIndexFromTime(relevantTimePos)
    {
        var sumOfTimes = 0;
        var stepLocation = 0;
        for(var i=0 ; i <= (screenTimes.length-1) ; i++)
        {

            sumOfTimes = sumOfTimes+screenTimes[i];
            if(i>0)
            {
                sumOfTimes = sumOfTimes+transitionDelay;
            }
            stepLocation = i;
            if(relevantTimePos < sumOfTimes)
            {
                break;
            }
        }

        return stepLocation;
    }








    function getStepLocation()
    {
        var sumOfTimes = 0;
        var stepLocation = 0;
        for(var i=0 ; i <= (screenTimes.length-1) ; i++)
        {

            sumOfTimes = sumOfTimes+screenTimes[i];
            if(i>0)
            {
                sumOfTimes = sumOfTimes+transitionDelay;
            }
            stepLocation = i;
            if(currBaseTimeInFleeq < sumOfTimes)
            {

                break;
            }
        }

        return stepLocation;
    }


    function getInStepMiliSecDiff()
    {

        var sumOfTimes = 0;
        var diff = 0;
        for(var i=0 ; i <= (screenTimes.length-1) ; i++)
        {
            var sumOfTimesBefore = sumOfTimes;
            sumOfTimes = sumOfTimes+screenTimes[i] ;
            if(i>0)
            {
                sumOfTimes = sumOfTimes+transitionDelay;
            }

            if(currBaseTimeInFleeq < sumOfTimes)
            {
                diff = screenTimes[i] - (sumOfTimes - currBaseTimeInFleeq);
                break;
            }


        }

        return diff;

    }


    function getAggrigatedTime(screen_num)
    {
        var sumOfTimes = 0;
        for(var i=0 ; i < screen_num ; i++)
        {
            var sumOfTimesBefore = sumOfTimes;
            sumOfTimes = sumOfTimes+screenTimes[i] + transitionDelay;
        }

        return sumOfTimes;
    }




    function getCurrentTimeInFleeq()
    {

        var returnVal = 0;

        if($('.tl-over-prefix').length > 0)
        {
            returnVal = parseFloat($('.tl-over-prefix').width()) + parseFloat($('.tl-over').width());
        }



        return returnVal;



    }



    function stopTimerCounter()
    {

        var d = new Date();
        currStopPlayInFleeq = d.getTime();


        if(!currStopPlayInFleeq || !currStartPlayInFleeq)
        {
            // currBaseTimeInFleeq = 0;
        }
        else
        {
            currBaseTimeInFleeq = currBaseTimeInFleeq+(currStopPlayInFleeq - currStartPlayInFleeq);
        }


        locationInStep = getInStepMiliSecDiff();
        currStepInFleeq = getStepLocation();



        anime.remove('.tl-over');
        $('.tl-over').css('width','0%');
        setPrefixOnTimeLine();

    }



    var timerPtr = false;


    function toClockTimer(val) {
        var sec_num = parseInt(val, 10); // don't forget the second param
        var hours   = Math.floor(sec_num / 3600);
        var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
        var seconds = sec_num - (hours * 3600) - (minutes * 60);

        if (hours   < 10) {hours   = "0"+hours;}
        if (minutes < 10) {minutes = "0"+minutes;}
        if (seconds < 10) {seconds = "0"+seconds;}
        return minutes+':'+seconds;
    }




    function locationToTimeConversion(pos)
    {
        var currTime =parseFloat(pos/100)*time  ;

        return currTime;
    }



    function currTimeInSecondsFloatingPoint()
    {
        var currTime =getCurrentTimeInFleeq()/$('.tl').width()*time/1000;
        return currTime;
    }

    function currTimeInSeconds()
    {
        var currTime = getCurrentTimeInFleeq()/$('.tl').width()*time/1000;
        return currTime;
    }

    function clockCalc()
    {

        var iframeE = document.getElementsByClassName("mobileMain")[0];
        if(typeof iframeE != 'undefined');
        else{
            return;
        }

        if( $('.timeClock').length > 0)
            $('.timeClock').html(toClockTimer(Math.floor(currTimeInSeconds()))+"  <span class='timeClockOutOff'> /"+ toClockTimer(Math.floor(parseFloat(time/1000)))+'</span>' );
    }


    startClock();


    function startClock()
    {

        timerPtr  = setInterval(clockCalc, 1000);

    }

    function stopClock()
    {

    }















    function moveToExactSpotAndTime(toScreen)
    {
        var relX = parseFloat(arrayOfPoints[toScreen]/100);

        goToSpecifcSectionInTimelineBasedOnPercentage(relX);
    }



    function updateSharePopupWithCurrentTime()
    {
        // $('.url-value').html(full_domain_link+'l/'+curr_code_key);
        // $('.box-for-time-in').data('status', 'off');
        // $('.box-for-time-in').html('<div class="wrapper-v"></div>');
        // $('.current-time-value span').html(toClockTimer(currTimeInSeconds()));
    }



    function moveToExactSpot(toScreen)
    {

        // moveToPause(false);
        removeAllTimeOuts();

        var currTime = currTimeInSeconds();


        fullNarrationFile.seek(currTime);
        // if(narration == '1')
        //     fullNarrationFile.play();




        // for the share popup
        updateSharePopupWithCurrentTime();


        continueRunningStep(toScreen);
        DisplayCurrentItem();
        $('.blackCurtain').fadeIn(0, function(){

            clockCalc();
            $('.blackCurtain').fadeOut(300, function(){
                if(!pauseMode)
                {
                    startTimerCounter();
                }

            });

        })
    }




    function goToSpecifcSectionInTimelineBasedOnPercentage(relX)
    {

        currBaseTimeInFleeq = time*relX;
        goToSpecifcSectionInTimeline();
    }



    function goToSpecifcSectionInTimeline()
    {



        currStartPlayInFleeq = false;
        currStopPlayInFleeq = false;


            stopTimerCounter();






        moveToExactSpot(currStepInFleeq);




        return 0 ;


    }




    // given the overlall timing, lets see if we need to do anything here






    var transitionInPercentage = false;



    function clearGIFopacityForScreen(screenNum)
    {
        if(typeof arrayOfGIFs[screenNum] === 'undefined');
        else
        {
            var elm = arrayOfGIFs[screenNum]['elm'];
            elm.css('opacity', '0.0');
        }
    }


    $(document).on('click', '.flow-cta', function(e){
        var currScreen =  _fleeqPlayer.currentScreen;
        var ctaIndex = $(this).data("index");
        var cta = info['flow_metadata'][(currScreen - 1)][ctaIndex];
        if(cta){
            switch(cta['target']){
                case "tab":
                    window.open(cta['value']);
                    break;
                case "current":
                    window.location = cta['value'];
                    break;
                case "step":
                    jumpToStep((parseInt(cta['value'])-1));
                    break;
            }
        }
    });


    $(document).on('click', '.sbs-cta.lastStep', function (e) {
        var currScreen =  _fleeqPlayer.currentScreen;
        jumpToStep((currScreen-1));
    });

    $(document).on('click', '.sbs-cta.nextStep', function (e) {
        if(pauseMode) {
            moveToPlay(false);
        }
        continueToNextStep();
    });

    function jumpToStep(stepIndex){
        $('.step-entry[data-screen-num="'+parseInt(stepIndex)+'"]').click();

        $('#flow-options').toggleClass("active", false);

        if(pauseMode)
            moveToPlay(false);

        setTimeout(function(e){
            canTransit = true;
            DisplayCurrentItem();
            _pingTrack();
        }, transitionDelay*1.1)
    }

    function showFlowCTAs(currScreen){
        moveToPause(false);
        var parent = $("#flow-options");
        var ctas = info['flow_metadata'][(currScreen - 1)];
        $(parent).attr("data-ctas", ctas.length);
        if(ctas.length !== 0){
            $(ctas).each(function(index, element){
                $(".flow-cta[data-index="+index+"]").html(element.text);
            });
        }
        parent.addClass("active");
    }

    function continueToNextStep(jumpingInTimeline)
    {

        $('#flow-options').toggleClass("active", false);


        if(jumpingInTimeline) {
            canTransit = true;
            //_pingTrack();
        } else {
            _fleeqPlayer.moveToDirection(false);
            setTimeout(function(e){
                canTransit = true;
                DisplayCurrentItem();
            }, transitionDelay*1.1)
        }
        document.onkeydown =  saved_keydown;


    }



    function checkAndDoAction(currLocation, allowAudioMargin)
    {
        var iframeE = document.getElementsByClassName("mobileMain")[0];
        if(typeof iframeE == 'undefined')
            return;

        var currScreen =  _fleeqPlayer.currentScreen;
        transitionInPercentage = parseFloat(transitionDelay/time);

        if(( currLocation > (arrayOfPoints[currScreen] - transitionInPercentage)))
        {
            if(canTransit)
            {
                canTransit = false;
                clearGIFopacityForScreen(currScreen+1);

                syncAudioToTimeLine(allowAudioMargin);
                if(!jumpingInTimeline && (stepByStepFlow || info['flow_metadata'][(currScreen - 1)].length)) {
                    showFlowCTAs(currScreen);
                    document.onkeydown =  null;
                    return;
                } else {
                    continueToNextStep(jumpingInTimeline);
                }


            }

        }


        var currTime = parseFloat(currLocation/100)*time;
        if(typeof arrayOfVids[currScreen] !== 'undefined') {
            var currData = arrayOfVids[currScreen];
            var vidElement = currData['element'];
            if(!pauseMode && currTime >= currData['start'] && currTime <= currData['end']){
                if(vidElement.paused){
                    var currTime = ((currTime - currData['start']) / 1000);
                    if(currTime < vidElement.duration){
                        vidElement.currentTime = currTime;
                        vidElement.play();
                    }else{
                        vidElement.currentTime = vidElement.duration;
                    }
                }
            }else{
                vidElement.pause();
            }
        }
        // check for GIFS



        if(canRunGIF)
        {

            if(typeof arrayOfGIFs[currScreen] === 'undefined');
            else
            {


                    var elm = arrayOfGIFs[currScreen]['elm'];
                    var elmPng = arrayOfGIFs[currScreen]['elmPng'];
                    var src = arrayOfGIFs[currScreen]['src']+"?t="+Math.random();
                    var src_png = arrayOfGIFs[currScreen]['src_png'];

                    if( (currTime >= arrayOfGIFs[currScreen]['startPoint'])
                        &&  (currTime < (arrayOfGIFs[currScreen]['startPoint'] + 200 ))    )
                    {

                        if(pauseMode)
                        {
                            elm.css('opacity', '0');
                            elmPng.css('opacity', '1');
                            canRunGIF = true;
                        }
                        else
                        {


                            if(canRunGIF)
                            {
                                // console.log('play real GIF: '+src);
                                canRunGIF = false;
                                elmPng.css('opacity', '0');
                                elm.css('opacity', '1');
                                console.log(arrayOfGIFs[currScreen]['blob']);
                                elm.attr('src', '').attr('src', src);
                                setTimeout(function(){
                                    canRunGIF = true;
                                }, 1200);
                            }
                        }
                    }
                    else
                    {
                        if(currTime > (arrayOfGIFs[currScreen]['startPoint'] + 200 ))
                        {
                            if(canRunGIF) {
                                // if()
                                elmPng.css('opacity', '1');
                                elm.css('opacity', '0');
                                canRunGIF = true;
                            }
                        }
                        else
                        {
                            elmPng.css('opacity', '0');
                            elm.css('opacity', '0');
                            canRunGIF = true;

                        }
                    }

                }
        }


    }

    var jumpingInTimeline = false;
    var inBufferMode = false;
    function changeLocationOnTimeline(percentageValue, shouldPlay)
    {

        if(splashOn)
            return;


        // still in buffer mode
        if(fullFileProgress < percentageValue)
        {

            if( $('.loader-2').css('display') == 'none')
            {
                $('.loader-2').css('display',"block");
                $('.loader-2').hide().fadeIn('slow');
            }


            // setTimeout(changeLocationOnTimeline.bind(null, percentageValue,shouldPlay),500);
            setTimeout( function(){
                changeLocationOnTimeline(percentageValue, shouldPlay);
            }, 500 );
            if(tlOverAnimPtr)
                tlOverAnimPtr.pause();

            if(!pauseMode)
            {
                 fullNarrationFile.pause();
            }

            $('.overlayIframe').css('background-color','#000000C0');
            inBufferMode = true;
            return;
        }


        if(inBufferMode)
        {
            $('.overlayIframe').css('background-color','#ffffff00');
            moveToPlay(true);
            inBufferMode = false;
            $('.loader-2').hide();
        }



        var screenIndex = _fleeqPlayer.currentScreen;
        var whereToGo = binarySearchForScreen(percentageValue);
        clearGIFopacityForScreen(whereToGo+1);
        jumpingInTimeline = true;
        _stopAllVideos();
        checkAndDoAction(percentageValue, false);

        if(screenIndex != whereToGo)
        {
            $('.blackCurtain').fadeIn(0, function(){
                _fleeqPlayer.resetToScreenOne(whereToGo);
                setTimeout(function(){
                    $('.blackCurtain').fadeOut(200, function(){
                        DisplayCurrentItem();

                        jumpingInTimeline = false;


                    });
                },100)

            })
        }
        else
            jumpingInTimeline = false;



        if(!howlr)
            fullNarrationFile.setPosition(parseFloat(percentageValue/100)*time);
        else
            fullNarrationFile.seek( parseFloat(parseFloat(percentageValue/100)*time/1000));

        tlOverAnimPtr.pause();
        tlOverAnimPtr.seek(percentageValue);



        if(!pauseMode )
        {
            tlOverAnimPtr.play();
            if(shouldPlay)
            {
                // if(!howlr  && (fullNarrationFile.playState == 0) )
                // {
                    // fullNarrationFile.pause();
                    fullNarrationFile.play();

                // }
                // else
                //     fullNarrationFile.play();
            }
        }


        if($('.cher-popup-wrapper').length > 0)
        {
            setTimeout(function(){
                clearSuffixForSharedLink();
                $('.current-time-value span').html(toClockTimer(currTimeInSeconds()));
            }, 300);
        }


    }


    function startTimeLineAnim()
    {
        anime.remove('.tl-over');
        $('.tl-over').css('width','0%')
        $('.tl-over').css('opacity','1');


        tlOverAnimPtr = anime({
            targets: '.tl-over',
            width: '100%',
            duration: time,
            easing: 'linear',
            autoplay: false ,
            complete: function(){
                setTimeout(addPostScreen, 1000);
            },
            update: function(anim) {

                // check for scheduled animations
                var currentOverallLocation  = anim.progress;
                checkAndDoAction(currentOverallLocation, true);
            }
        })

        tlOverAnimPtr.play();
    }




    function binarySearchForScreen(positionToFind)
    {


        var searchInArray = arrayOfPoints.slice();
        searchInArray.push(100);
        searchInArray[0] = 0;
        var numOfPoints = searchInArray.length;

        var startingP = Math.floor(numOfPoints/2);
        var currScreenTime = searchInArray[startingP];
        var nextScreenTime = searchInArray[startingP+1];


        var topPosition = numOfPoints;
        var baesSearchPosition = 0;

        var counter = 0;
        while( !((positionToFind > currScreenTime) && (positionToFind <= nextScreenTime)) )
        {

            var saveBaseSearchPosition = baesSearchPosition;
            var saveTopPosition = topPosition;
            if( positionToFind > nextScreenTime)
            {
                topPosition = saveTopPosition;
                baesSearchPosition = startingP+1;
            }
            else
            {
                topPosition = startingP-1;
                baesSearchPosition = saveBaseSearchPosition;
            }

            startingP = baesSearchPosition + Math.floor((topPosition - baesSearchPosition)/2);



            currScreenTime = searchInArray[startingP];
            nextScreenTime = searchInArray[startingP+1];

            counter =counter + 1;
            if(counter > 20) {

                startingP = -1;
                    break;
            }
        }


        // console.log(startingP+1);

        return startingP+1;
    }



    $(document).on('click', '.tl-hover-layer', function (e) {


        if(!canTransit)
        {

            return;
        }

        var parentOffset = $(this).parent().offset();
        var relX = e.pageX - parentOffset.left;
        relX = Math.ceil(relX/ window.innerWidth*100);
        // console.log(relX);
        // console.log(binarySearchForScreen(relX));


        changeLocationOnTimeline(relX, false)

        // goToSpecifcSectionInTimelineBasedOnPercentage(relX)

    })



    function stopProgressTimer()
    {
        // val = time - currTimeInFleeq*1000


    }



    function calculateTime()
    {
        //  var iframeE = document.getElementsByClassName("mobileMain")[0];
        // if(typeof  screenTimes != 'undefined');
        // else {
        //     return;
        // }
        // var sumOfTimeLine = parseFloat(0) ;
        // for (var i = 0; i < screenTimes.length ; i++)
        // {
        //     sumOfTimeLine = parseFloat(sumOfTimeLine + transitionDelay + parseFloat(screenTimes[i]));
        // }
        time = info['info']['guide_duration'];







        org_time = time;
    }



    function msToTime(ms){
        if(typeof ms === "string"
        && ms.split(":").length == 2){
            return ms;
        }
        var secs = Math.floor(ms / 1000);
        var msleft = ms % 10;
        var hours = Math.floor(secs / (60 * 60));
        var divisor_for_minutes = secs % (60 * 60);
        var minutes = Math.floor(divisor_for_minutes / 60);
        var divisor_for_seconds = divisor_for_minutes % 60;
        var seconds = Math.ceil(divisor_for_seconds);
        if(seconds < 10)
        {
            seconds = '0' + seconds;
        }
        return  minutes + ":" + seconds;
    }



    function calcVideoDuration()
    {

        var durationTime = 0;

        for (var i = 0 ; i < screenTimes.length ; i++)
        {
            durationTime = parseInt(parseInt(durationTime + parseInt(screenTimes[i])) + parseInt(transitionDelay)) ;
        }


        return msToTime(durationTime);

    }



    function loadImageToDom(path, width, height, target) {
        $('<img src="'+ path +'"  class="preLoadToDome">' ).load(function() {
            $(this).width(width).height(height).appendTo(target);
        });
    }


    var arrayOfGIFs = [];
    var arrayOfVids = [];

     function structGIFS() {


        if(typeof info['gif_metadata'] === 'undefined');
        else {
            if (info['gif_metadata']) {
                $('.mobileMain').find('.showElementClicked img[src*="gif"]').each(function (index) {
                    var dataElementDbId = $(this).closest('.showElementClicked').attr('data-element-db-id');
                    var res = dataElementDbId.split("_");
                    var currScreen = res[2];
                    var startPoint = 0;


                    var currGIF = [];


                    var stepDur = getStepDuration(currScreen);
                    var gifMinDur = 2000;

                    if ((1 - parseFloat(info['gif_metadata'][currScreen])) * stepDur > gifMinDur)
                        startPoint = parseFloat(info['gif_metadata'][currScreen]) * stepDur;
                    else
                        startPoint = stepDur - gifMinDur;

                    var elm = $('.mobileMain').contents().find('.showElementClicked[data-element-db-id="' + dataElementDbId + '"] img');
                    var elmWrapper = $('.mobileMain').contents().find('.showElementClicked[data-element-db-id="' + dataElementDbId + '"]');
                    var src = elm.attr('src');
                    if (startPoint < 1000) {
                        startPoint = 1000;
                    }

                    // elm.css('opacity','0.0');


                    currGIF['src'] = src;
                    currGIF['src_png'] = (src.substring(0, src.length - 3))+'png';
                    currGIF['screenNum'] = currScreen;
                    currGIF['startPoint'] = startPoint + screenTimesOffsets[currScreen];
                    // fetch(src)
                    //     .then((response) => response.blob())
                    //     .then((blob) => {
                    //         currGIF['blob'] = blob;
                    //         // const imageUrl = URL.createObjectURL(blob);
                    //         // const img = document.querySelector('img');
                    //         // img.addEventListener('load', () => URL.revokeObjectURL(imageUrl));
                    //         // document.querySelector('img').src = imageUrl;
                    //     });
                    var prepForPngWrapper = elmWrapper.clone();
                    elmWrapper.after(prepForPngWrapper);

                    var prepForPng = prepForPngWrapper.find('img');
                    prepForPng.attr('src', currGIF['src_png']);
                    prepForPngWrapper.addClass('isPng');


                    elm.css('opacity','0');
                    prepForPng.css('opacity','0');





                    currGIF['elm'] = elm;
                    currGIF['elmPng'] = prepForPng;

                    // switch to png

                    // loadImageToDom( currGIF['src_png'] , 10 , 10 , 'body')

                        arrayOfGIFs[(parseInt(currScreen)+1).toString()] = currGIF;


                });
            }
        }


     }
    function structVids(){
        if(arrayOfVids.length){
            return true;
        }
        var allLoaded = true;
         $('.mobileMain').contents().find("video.video-content").each(function(){
             var dataElementDbId = $(this).closest('.showElementClicked').attr('data-element-db-id');
             var res = dataElementDbId.split("_");
             var currScreen = res[2];
             if(this.readyState === 0){
                 allLoaded = false;
             }
             var stepDuration = getStepDuration(currScreen);
             arrayOfVids[(parseInt(currScreen)+1).toString()] = {
                 element: this,
                 start: screenTimesOffsets[currScreen],
                 end: (screenTimesOffsets[currScreen] + stepDuration)
             };
             this.pause();
         });
         if(!allLoaded){
             arrayOfVids = [];
         }
         return allLoaded;
    }
    function _stopAllVideos(){
        $('.mobileMain').contents().find("video.video-content").each(function(){
           this.pause();
        });
    }

    function buildTimeLinePoints()
    {

        calculateTime();
        var iframeE = document.getElementsByClassName("mobileMain")[0];

        if(typeof  iframeE != 'undefined');
        else
        {
            return;
        }


        // addPointOnTimeLine(0, 0);

        for (var i = 0; i < screenTimes.length; i++)
        {

            var screenWait = 0;// screenTimes[i] + transitionDelay ;
            for (var j = 0; j <= i; j++)
            {

                    screenWait = screenWait + parseFloat(screenTimes[j]) + transitionDelay;

            }
            screenWait = screenWait-transitionDelay;




            if(i < (screenTimes.length - 1))
                addPointOnTimeLine(screenWait, i+1);
        }

    }


    var timeOutToStartGif = false;





    function syncFleeqInRealTime()
    {
        var currScreen =  _fleeqPlayer.currentScreen;
          currScreen = currScreen -1;
        var delayPlus =  transitionDelay;





        var screenWait = screenTimes[currScreen] -  locationInStep ;
        var currDelay = screenWait + delayPlus ;
        if(currDelay < 0 )
        {
            currDelay = 0;
        }


        $('.mobileMain').contents().find('.showElementClicked img[src*="gif"]').each(function(index)
        {
            var dataElementDbId = $(this).closest('.showElementClicked').attr('data-element-db-id');
            var res = dataElementDbId.split("_");
            if(res[2] == currScreen)
            {
                var startPoint = 0;
                if(typeof info['gif_metadata'] === 'undefined');
                else
                {
                    if(info['gif_metadata'])
                    {
                        if(typeof info['gif_metadata'][currScreen] === 'undefined');
                        else
                        {
                            var stepDur = getStepDuration(currScreen);
                            var gifMinDur = 2000;

                            if((1 - parseFloat(info['gif_metadata'][currScreen]))*stepDur > gifMinDur )
                                startPoint = parseFloat(info['gif_metadata'][currScreen])*stepDur;
                            else
                                startPoint = stepDur - gifMinDur;
                        }
                    }
                }
                var elm = $('.mobileMain').find('.showElementClicked[data-element-db-id="'+dataElementDbId+'"] img');
                if(startPoint < 1000)
                {
                    startPoint = 1000;
                }
                elm.css('opacity','0.0');
                timeOutToStartGif =  setTimeout(function(){
                    var src = elm.attr('src');
                    elm.attr('src', src);
                    elm.css('opacity','1.0');
                }, startPoint);
            }
        });






        if(isMobileDevice && !isInIframe && (narration == '1'))
        {

            canTransit = true;
            var timeOutPointer =  setTimeout(function(){ moveOn();}, currDelay);
            allTimeOuts.push(timeOutPointer);
        }
        else
        {


            var timeOutPointer =  setTimeout(function(){ moveOn();}, currDelay);
            allTimeOuts.push(timeOutPointer);
            // playAudioInStep(locationInStep, true);
        }

        locationInStep = 0;



    }





    function syncAccordToRealTime()
    {
         var toScreen = parseInt(_fleeqPlayer.numberOfScreens - 1 );
        var currScreen =  _fleeqPlayer.currentScreen;
        currScreen = currScreen -1;
        var delayPlus =  transitionDelay;

        var screenWait = parseFloat(screenTimes[currScreen]);
        var currDelay = delayPlus + screenWait;



        // if(isMobileDevice && !isInIframe && (narration == '1'))
        {
            canTransit = true;
            var timeOutPointer =  setTimeout(function(){ rightClicked('h');}, currDelay);
            allTimeOuts.push(timeOutPointer);
        }
        // else
        // {
        //     var timeOutPointer =  setTimeout(function(){ rightClicked('h');}, currDelay);
        //     allTimeOuts.push(timeOutPointer);
        //     playSectionAudio();
        // }



        // fillThisTimeLineSection(currScreen);
        // killRunningBackground();

        if(isMobileDevice)
        {
            DisplayCurrentItem();
        }
        else {
            if(!single_quote)
            {
                focusOnCurrentLeftItem();
            }
            else
            {
                DisplayCurrentItem();
            }
        }









    }

    function jumpToScreenByElement(toScreenElm)
    {
        if(!canTransit)
        {
            return;
        }
        canTransit = false;
        setTimeout(function(){canTransit = true;}, transitionDelay*1.5);

        // if(!canTransit)
        // {
        //     return;
        // }
        canTransit = false;
        setTimeout(function(){canTransit = true;}, transitionDelay*1.5);
        var currScreen =  _fleeqPlayer.currentScreen;
        currScreen = currScreen-1;
        var toScreen = toScreenElm.getAttribute('screen-num');

        // if(toScreen == currScreen)
        // {
        //     return 0 ;
        // }

        removeAllTimeOuts();
        muteAudio();


        var toScreen = toScreenElm.getAttribute('screen-num');
        jumpToScreen(toScreen);
    }


    function jumpToScreen(toScreen , removeFlicker ) {
        var iframeE = document.getElementsByClassName("mobileMain")[0];
        if (!iframeE) {
            return 0;
        }
        var currScreen = _fleeqPlayer.currentScreen;

        _fleeqPlayer.resetToScreenOne(toScreen);
        setTimeout(moveInAccordionFullRightSide, 100);
        // pauseVid();
        if (pauseMode) {
            setTimeout(function () {
                 setTimeLineColors();
            }, 250);
        }
    }





    function jumpToScreenNoPlay(toScreen , removeFlicker ) {
        var iframeE = document.getElementsByClassName("mobileMain")[0];
        if (!iframeE) {
            return 0;
        }
        var currScreen = _fleeqPlayer.currentScreen;

        _fleeqPlayer.resetToScreenOne(toScreen);
        pauseVid();
        if (pauseMode) {
            setTimeout(function () {
                setTimeLineColors();
            }, 250);
        }
    }





    function syncAccordionToScreen(element)
    {

        var toScreen = element.getAttribute('screen-num');
        var iframeE = document.getElementsByClassName("mobileMain")[0];
        var currScreen =  _fleeqPlayer.currentScreen;
        currScreen = currScreen-1;

        var delay = transitionDelay;

        var delayPlus =  delay;
        if(toScreen == (currScreen + 1) )
        {
            rightClicked('h');
        }
        else
        {
            if(toScreen == (currScreen - 1))
            {
                leftClicked('h');
            }
            else
            {
                if(toScreen > currScreen)
                {
                    var diff = toScreen -  currScreen - 1;
                    rightClicked('h');

    //                transitionDelayFast = 1;

                        for (var i = 1; i <= diff; i++)
                         {
                             setTimeout(function(){ rightClicked('h');}, delayPlus*i);
                         }
    //                transitionDelayFast = false;

                }
                else
                {
                    var diff =  currScreen - toScreen - 1;
                    leftClicked('h');


    //                transitionDelayFast = 1;
                    for (var i = 1; i <= diff; i++)
                    {
                        setTimeout(function(){ leftClicked('h');}, delayPlus*i);
                    }
    //                transitionDelayFast = false;
                }
            }
        }



    }

    function setAccordionBackLinks()
    {
        var boxTitle = document.getElementsByClassName("accord-element");
        for (var i = 0; i < boxTitle.length; i++) {
            boxTitle[i].addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation();   jumpToScreenByElement(this); }, false);

        }


    }

    var toolTipLoading = false;
    var toolTipUnLoading = false;



    function setTimeLimePointsBackLinks()
    {
        var pointTitle = document.getElementsByClassName("tl-el-point");
        for (var i = 0; i < pointTitle.length; i++) {
            pointTitle[i].addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation();   jumpToScreenByElement(this); }, false);
        }


    }







    var fullAudioFileLoaded = false;
    var fullNarrationAudioSteps = [];

    var loaded = 0;
    function preloadAudio(url , i ) {

        fullNarrationAudioSteps[i] = new Howl({
            src: [url]
        });

        fullNarrationAudioStepsNextFleeq[curr_code_key][i] = fullNarrationAudioSteps[i];

        fullNarrationAudioSteps[i].on('load', function(){
            loaded++;
            if (loaded == audioFiles.length){
                fullAudioFileLoaded  = true;
            }
        });

    }

    var audioFilesNextFleeq = [];
    var fullNarrationAudioStepsNextFleeq = [];
    var loadedNextFleeq = [];

    function preloadAudioNextFleeq(url , i , code_key) {



        fullNarrationAudioStepsNextFleeq[code_key][i] = new Howl({
            src: [url]
        });

        fullNarrationAudioStepsNextFleeq[code_key][i].on('load', function(){
            loadedNextFleeq[code_key] = parseInt(loadedNextFleeq[code_key]) + 1;
            if (loadedNextFleeq[code_key] == audioFilesNextFleeq[code_key].length){


            }
        });
    }

    // var loaded = 0;
    // function loadedAudio() {
    //     // this will be called every time an audio file is loaded
    //     // we keep track of the loaded files vs the requested files
    //     loaded++;
    //
    //     //if (loaded == 1){
    //     if (loaded == audioFiles.length){
    //         // all have loaded
    //         //allLoaded = true;
    //         fullAudioFileLoaded  = true;
    //     }
    // }
    //
    //
    // function preloadAudio2(url , i ) {
    //
    //     var audio = new Audio();
    //     audio.src = url;
    //     audio.addEventListener('loadstart', loadedAudio, false);
    //
    // }


    var allLoaded = false;



    var player = document.getElementById('player');
    function play(index) {
    //    player.src = audioFiles[index];
    //    player.play();
    }

    function init() {
    //    console.log('Done!!!!');
    }




    var muteTimer = false;

    function playAudioInStep(offsetInAudio, shouldPlay)
    {
        var iframeE = document.getElementsByClassName("mobileMain")[0];
        var currScreen =  _fleeqPlayer.currentScreen;




        return 0 ;




        if( (typeof fullNarrationAudioSteps[currScreen-1] != 'undefined') && !inVidRecording)
        {
            if(fullNarrationAudioSteps[currScreen-1] != null)
            {
                if(muteTimer)
                    clearTimeout(muteTimer);

                if(fullNarrationAudioSteps[currScreen-1]) {
                    if (isMobileDevice  && !isInIframe);
                    else
                    {
                        if(currAudio)
                            currAudio.stop();
                        currAudio = fullNarrationAudioSteps[currScreen-1];

                        document.onkeydown =  null;
                        setTimeout( function(){
                            if(!allMute)
                            {

                                currAudio.seek(Math.floor(offsetInAudio/1000));
                                if(shouldPlay)
                                    currAudio.play();
                                else
                                    currAudio.pause();
                                currAudio.mute(false);
                                currAudio.volume(1.0);
                            }
                            //currAudio.muted = false;
                            if(volumeOff)
                            {
                                // currAudio.volume = 0;
                                currAudio.volume(0.0);
                            }
                            else
                            {
                                currAudio.volume(1.0);
                            }
                            document.onkeydown =  saved_keydown;
                        }, 100 ) ;

                    }
                }
            }
            else
            {
                document.onkeydown =  saved_keydown;
            }
        }
        else
        {
            document.onkeydown =  saved_keydown;
        }
    }




    function playSectionAudio()
    {
        var currScreen =  _fleeqPlayer.currentScreen;



       if( (typeof fullNarrationAudioSteps[currScreen-1] != undefined) && !inVidRecording)
       {
           if(fullNarrationAudioSteps[currScreen-1] != null)
           {
                if(muteTimer)
                    clearTimeout(muteTimer);

               if(fullNarrationAudioSteps[currScreen-1]) {
                   if (isMobileDevice  && !isInIframe) {

                   }
                   else
                   {


                        if(currAudio)
                            currAudio.stop();
                        currAudio = fullNarrationAudioSteps[currScreen-1];

                       document.onkeydown =  null;
                       setTimeout( function(){
                           if(!allMute)
                           {
                               currAudio.play();

                               currAudio.mute(false);
                               currAudio.volume(1.0);
                           }
                               //currAudio.muted = false;
                           if(volumeOff)
                           {
                               // currAudio.volume = 0;
                               currAudio.volume(0.0);
                           }
                           else
                           {
                               currAudio.volume(1.0);
                           }
                           document.onkeydown =  saved_keydown;
                       }, 500 ) ;

                   }
               }


           }
           else
           {
               document.onkeydown =  saved_keydown;
           }
       }
       else
       {
           document.onkeydown =  saved_keydown;
       }
    }



    function removeElementsByClass(className){
        var elements = document.getElementsByClassName(className);
        while(elements.length > 0){
            elements[0].parentNode.removeChild(elements[0]);
        }
    }

    function removeElementById(idName){
        var elm = document.getElementById(idName);
        if(elm)
        {
            elm.parentNode.removeChild(elm);
        }

    }

    function flickerMainContent()
    {





            anime({
            targets: '.mobileMain',
            opacity: 0,
            duration: 50,
            easing: 'linear',
            complete: function()
            {





                anime({
                    targets: '.mobileMain',
                    opacity: 1,
                    duration: 450,
                    delay: 100,
                    easing: 'linear'
                });

            }

        });






    //    anime({
    //        targets: '#modal-content',
    //        opacity: '0',
    //        duration: 20,
    //        easing: 'linear',
    //        complete: function(){
    //            anime({
    //                targets: '#modal-content',
    //                opacity: '1',
    //                delay: 50,
    //                duration: 100,
    //                easing: 'linear'
    //            })
    //        }
    //    })
    }



    //window.addEventListener("focus", function(event) { console.log("window has focus"); }, false);
    //window.addEventListener("blur", function(event) { console.log("window lost focus"); }, false);



    function killRunningBackground()
    {


        $('.tl-over').css('width','0px');
        $('#runningbg').gradientProgressBar({
            value: 0.0,

        });

    }

    function runningBackground(duration)
    {

        w = 500;
        if(isMobileDevice)
        {
            w = mobileScreenWidth;
            if(isInIframe)
            {
                w = mobileScreenWidth*0.8;
            }

        }

        //console.log(duration);
        $('#runningbg').gradientProgressBar({
            value: 1.0,
            size: w,
            fill: {
                gradient: [grad_A, grad_B]
            },
            animation: {
                duration: parseInt(parseInt(duration) + 600 ) , easing: false
            }

        });


    }


    function isEmptyContent(currScreen)
    {

        var currTitle = document.querySelector("#accord_cb_"+currScreen+" > .box-title").innerHTML.length;
        var currContent = document.querySelector("#accord_cb_"+currScreen+" > .box-content").innerHTML.length;

        if(parseInt(currTitle  + currContent) == 0)
        {
            return true;
        }
        return false;



    }

    function focusOnCurrentLeftItem()
    {
        var currScreen =  _fleeqPlayer.currentScreen;
        var allAccords = document.getElementsByClassName("accord-element");

        removeElementsByClass('left-circle-highlight');
        removeElementById('runningbg');

        for (i = 0; i < allAccords.length; i++) {
            allAccords[i].style.opacity = 0.2;
        }


        if(info['product']['player_type'] == 2)
        {
            var currContent = document.getElementById("accord_cb_"+currScreen);
            currContent.style.opacity=1.0;
            var glowDiv = '<div class="left-circle-highlight"></div>';
            var wrapper= document.createElement('div');
            wrapper.innerHTML= glowDiv;
            var divNew = wrapper.firstChild;
            currContent.insertBefore(divNew , currContent.childNodes[0]);



            //runBonsai();
            addLeftGlowIcon();
        }







        if( (info['product']['player_type'] == 2) || (info['product']['player_type'] == 4)) {

            var runningBgDiv = '<div id="runningbg"></div>';
            var wrapper = document.createElement('div');
            wrapper.innerHTML = runningBgDiv;
            var divNew = wrapper.firstChild;
            currContent.insertBefore(divNew, currContent.childNodes[0]);


            if(!pauseMode)
            {
                if(isEmptyContent(currScreen))
                {
                    // console.log('Its empty!');
                }
                runningBackground(screenTimes[currScreen-1]);
            }
        }

    }




    function DisplayCurrentItem()
    {
        var currScreen =  _fleeqPlayer.currentScreen;
        var screenIncoming = currScreen-1;
        if(!steps[screenIncoming])
            return;
        var newContent = steps[screenIncoming]['content'];
        _pingTrack();
        manageCaptions(screenIncoming);
        $('#single-quote .content').html(newContent);
        return 0;
    }







    var scrollOffset = 0;

    function clearAllHoverTimeLineColors()
    {
        //return;
        var allElm = document.querySelectorAll('.tl-line');

        for(var  i = 0 ; i < allElm.length ; i++)
        {
            removeClass(allElm[i] , 'in-tl');
        }

        allElm = document.querySelectorAll('.tl-el-point');

        for(var  i = 0 ; i < allElm.length ; i++)
        {
            removeClass(allElm[i] , 'in-tl');
        }


        if(tlOverAnimPtr)
        {
            //tlOverAnimPtr.des;

            anime.remove('.tl-over');
        }



        if(document.querySelector('.tl-over'))
        {

            document.querySelector('.tl-over').style.width = '0px';
        }
    }



    function highlightPointOnTimeLine(index)
    {



        if(document.querySelector('.tl-el[screen-num="'+index+'"] .tl-el-point')  &&
            document.querySelector('.tl-el[screen-num="'+index+'"] .tl-line'))

        {
            var    elmStartPosition = document.querySelector('.tl-el[screen-num="'+index+'"]').getAttribute('start-position');

            var elmEndPosition;
            if(index < parseInt(_fleeqPlayer.numOfScreens -1) )
                elmEndPosition = document.querySelector('.tl-el[screen-num="'+parseInt(index+1)+'"]').getAttribute('start-position');




            document.querySelector('.tl-over').style.marginLeft = '0px';
            document.querySelector('.tl-over').style.width = '0px';
            $('.tl-over-prefix').css('width', elmStartPosition+'px');

            // addClass(document.querySelector('.tl-el[screen-num="'+index+'"] .tl-el-point') , 'in-tl');
            // addClass(document.querySelector('.tl-el[screen-num="'+index+'"] .tl-line') , 'in-tl');
            return true;

        }
        else
            return false;

    }





    var repeater;
    var currE;

    function checkPosition()
    {
        var X = $('body').offset().left;
        var Y = $('body').offset().top;
        mouseX = ev.pageX - X;
        mouseY = ev.pageY - Y;


    }




    $(document).on('mouseleave', '#main-content', function (e) {
            // $('.tl-el-point').css('background-color', 'transparent');
    })




    $(document).on('mouseleave', '.tl-hover-layer ', function (e) {

        $('.live-thumbnail').css('display','none');
    })




    // $(document).on('mouseover', '.live-thumbnail', function (e) {
    //
    //     $('.live-thumbnail').css('display','block');
    // });


    $(document).on('mousemove', '.tl-hover-layer', function (e) {


        if(VolumeInDragMode)
            return;

        var parentOffset = $(this).parent().offset();
        //or $(this).offset(); if you really just want the current element's offset
        var relX = e.pageX - parentOffset.left;
        relXPercentage = 100*Math.floor(relX)/window.innerWidth;

        var currTimeInHover = locationToTimeConversion(relXPercentage);
        var currScreenToShow = getStepIndexFromTime(currTimeInHover);




        if( $('.live-thumbnail').css('display') == 'none' )
            $('.live-thumbnail').css('display','block');

        var currStartImageCrop = 75*currScreenToShow*(-1);
        $('.live-thumbnail .step-entry-thumbnail.crop img').css('margin-top', currStartImageCrop+'px');


        var calc = relX - ($('.live-thumbnail').width()/2);
        if(calc < 10 )
            calc  = 10;

        if(calc > (window.innerWidth -10 - $('.live-thumbnail').width() ) )
            calc = window.innerWidth -10 - $('.live-thumbnail').width() ;

        $('.live-thumbnail').css('left', calc+'px');


        $('.timer-on-th').html(toClockTimer(Math.ceil(currTimeInHover/1000)));



    });




    function showControlsFromPlayer()
    {

        if(isGif || ($('.bottom-vid-drawer').length < 1) || ($('.fullOverPost').length > 0) || inVideoRecording || $("#flow-options").hasClass("active"))
            return;


        noControlBar  = false;
        document.querySelector('.bottom-vid-drawer').style.setProperty('opacity', 1, 'important');
        document.querySelector('.timeline').style.setProperty('opacity', 1, 'important');

        document.querySelector('.top-right-item.share').style.setProperty('opacity', 1, 'important');
        document.querySelector('.top-right-item.series').style.setProperty('opacity', 1, 'important');
        document.querySelector('.top-right-item.indie').style.setProperty('opacity', 1, 'important');
        adjustCCHeight();
        clearTimeout(timerForBarHoverRemoval);
    }



    var noControlBar  = false;
    var timerForBarHoverRemoval = false;
    $(document).on('mouseover', '#modal-content , .bottom-vid-drawer , .timeline , .content-wrapper , .displayInfoSection', function (e) {

        showControlsFromPlayer();
    });




    function removeControlsFromPlayer()
    {
        if(isGif || ($('.bottom-vid-drawer').length < 1) || ($('.fullOverPost').length > 0))
            return;

        timerForBarHoverRemoval = setTimeout(function() {
            noControlBar = true;
            document.querySelector('.bottom-vid-drawer').style.setProperty('opacity', 0, 'important');
            document.querySelector('.timeline').style.setProperty('opacity', 0, 'important');

            document.querySelector('.top-right-item.share').style.setProperty('opacity', 0, 'important');
            document.querySelector('.top-right-item.series').style.setProperty('opacity', 0, 'important');
            document.querySelector('.top-right-item.indie').style.setProperty('opacity', 0, 'important');
            adjustCCHeight();
        },500);
    }



    var timeoutMouseIdeal;
    document.onmousemove = function(){
        clearTimeout(timeoutMouseIdeal);
        timeoutMouseIdeal = setTimeout(function(){removeControlsFromPlayer();}, 3000);
        showControlsFromPlayer();
    }



    $(document).on('mouseleave', '#modal-content , .bottom-vid-drawer , .timeline , .content-wrapper , .displayInfoSection', function (e) {

        removeControlsFromPlayer();

    });



    var currMilisec = false;
    // function runMainSectionProgressBar()
    // {
    //     tlOverAnimPtr = anime({
    //         targets: '.tl-over',
    //         width: widthToFill+'%',
    //         duration: screenTimes[index],
    //         easing: 'linear',
    //         complete: function(){
    //
    //         }
    //     })
    // }




    var OverlayProgressSeries = false;
    function fillThisTimeLineSection(index)
    {
     // //get the x position start/length/duration
     //
     //
     //
     //
     //    if(!realMobile)
     //    {
     //        return;
     //    }
     //
     //
     //
     //    clearAllHoverTimeLineColors();
     //    if(!highlightPointOnTimeLine(index))
     //    {
     //        return 0;
     //    }
     //    var  elmStartPosition = document.querySelector('.tl-el[screen-num="'+index+'"]').getAttribute('start-position');
     //
     //
     //
     //    var iframeE = document.getElementsByClassName("mobileMain")[0];
     //    var maxRepeat =  _fleeqPlayer.numOfScreens;
     //
     //
     //
     //    var w = $('#modal-content').width();
     //    if(isMobileDevice)
     //    {
     //        w = mobileScreenWidth - 5;
     //        if(isInIframe)
     //        {
     //            w = $('#modal-content').width();
     //
     //        }
     //        else
     //        {
     //            w = mobileScreenWidth*0.7;
     //        }
     //
     //    }
     //    else
     //    {
     //        w = 1024*ratio;
     //    }
     //
     //
     //    var elmEndPosition = w;
     //    if(index < parseInt(_fleeqPlayer.numOfScreens -1) )
     //        elmEndPosition = document.querySelector('.tl-el[screen-num="'+parseInt(index+1)+'"]').getAttribute('start-position');
     //
     //
     //    var widthToFill = parseInt(elmEndPosition - elmStartPosition);
     //
     //
     //    document.querySelector('.tl-over').style.marginLeft = '0px';
     //    document.querySelector('.tl-over').style.width = '0px';
     //
     //
     //
     //    $('.tl-over-prefix').css('width', elmStartPosition+'%');
     //
     //
     //
     //
     //    tlOverAnimPtr = anime({
     //        targets: '.tl-over',
     //        width: widthToFill+'%',
     //        duration: screenTimes[index],
     //        easing: 'linear',
     //        complete: function(){
     //
     //        }
     //    })
     //
     //
     //
     //
     //    // fill course lower section
     //
     //    if(info['inCourse'])
     //    {
     //
     //        // get full length, calc location in time
     //
     //        var maxWidth = $('.horizontal.coursetimeline .steps .step.active').innerWidth();
     //        var fleeq_full_duration = info['info']['guide_duration'] ;
     //
     //        var time_till_now = 0;
     //        var curr_step_duration = getStepDuration(index);
     //        for(var j = 0 ; j < index ; j++)
     //        {
     //            time_till_now = time_till_now + getStepDuration(j) +555;
     //
     //        }
     //
     //
     //
     //        var diff_duration = fleeq_full_duration - time_till_now;
     //
     //
     //        widthToFillOverFlow = maxWidth*(parseFloat(curr_step_duration/fleeq_full_duration));
     //        $('.over-flow-progress').css('width','0px');
     //
     //        var prefixWidth = maxWidth*(parseFloat(time_till_now/fleeq_full_duration));
     //        $('.over-flow-progress-prefix').css('width',prefixWidth+'px');
     //
     //        OverlayProgressSeries = anime({
     //            targets: '.horizontal.coursetimeline .steps .step.active .over-flow-progress',
     //            width: widthToFillOverFlow+'px',
     //            duration: curr_step_duration,
     //            easing: 'linear',
     //            complete: function(){
     //
     //            }
     //        })
     //    }
     //
     //


    }



    function getStepDuration(j)
    {
        var step_dur;
        step_dur =  parseInt(info['steps'][j]['duration_f']);
        return step_dur;


        if (info['info']['enable_narration'])
        {
            step_dur =  parseInt(info['steps'][j]['duration_f']);
        } else {
            if(info['info']['enable_captions']){
                step_dur =  parseInt(info['steps'][j]['duration_f']);
            }else{
                step_dur = 2000;
            }
        }



        return step_dur;
    }



    $(document).on('click', '.appLogo img , .logo-follow img', function (ev) {



        if(info['info']['plan_id'] == 2)
        {
            goToAttributionReferal();
        }
        else
        {
            if(typeof info['info']['app_logo_info']['app_logo_url'] !== 'undefined') {
                if (info['info']['app_logo_info']['app_logo_url']) {
                    if (info['info']['app_logo_info']['app_logo_url'].length > 0) {
                        var prefix = 'http://';
                        if (info['info']['app_logo_info']['app_logo_url_https'] == '1') {
                            prefix = 'https://';
                        }

                        window.open(prefix + info['info']['app_logo_info']['app_logo_url']);

                        moveToPause(false);
                    }
                }
            }
        }




    })




    function manageCaptions(val)
    {



        if(info['info']['enable_captions'] == 0)
        {
            $('#single-quote').css('display','none');
        }
        else{
            if($('#single-quote .content').length > 0)
            {
                if(!steps[val]['content']
                    || steps[val]['content'].length == 0
                    || steps[val]['content'] == null
                    || steps[val]['content'].length > 160) {
                    $('#single-quote').css('display','none');
                } else {
                    setTimeout(function(){
                        $('#single-quote').css('display','block');
                        sizeFAQ();
                    }, 100)
                }
            }
        }


    }





    function continueRunningStep(toScreen)
    {

        // if($('.currScreenIndication').length == 0)
        // {
        //     return 0 ;
        // }

        var iframeE = document.getElementsByClassName("mobileMain")[0];
        if (!iframeE) {
            return 0;
        }

        // this is false in the case of play pause;
        if(toScreen >= 0)
            _fleeqPlayer.resetToScreenOne(toScreen);

        var currScreen =  _fleeqPlayer.currentScreen;
        // document.querySelector('.currScreenIndication').innerHTML = currScreen;







        if(!pauseMode)
        {
            manageCaptions(currScreen-1);

            syncFleeqInRealTime();
            if(toScreen >= 0)
                DisplayCurrentItem();

        }
        else
        {
            playAudioInStep(locationInStep, false);
        }

    }



    function moveInAccordionFullRightSide()
    {

        if($('.currScreenIndication').length == 0)
        {
            return 0 ;
        }
        var currScreen =  _fleeqPlayer.currentScreen;


        document.querySelector('.currScreenIndication').innerHTML = currScreen;


        if(!pauseMode)
        {
            //playSectionAudio();
            //fillThisTimeLineSection(currScreen-1);



             // check if captions have any content
             manageCaptions(currScreen-1);

             syncAccordToRealTime();

        }
        else
        {




            clearAllHoverTimeLineColors();
            highlightPointOnTimeLine(currScreen-1);


            if(info['product']['player_type'] == 2)
            {
                focusOnCurrentLeftItem();
            }
            else
            {
                DisplayCurrentItem();
            }

        }




        if(info['product']['player_type'] == 2)
        {
            var accumulatedHeight = 0 ;

            for (var i = 0; i < currScreen; i++) {
                accumulatedHeight = accumulatedHeight + document.getElementById("accord_cb_"+parseInt(i+1)).clientHeight;
            }


            var defaultDuration = 1700
            var edgeOffset = 10
            var myDiv = document.querySelector(".accordion.arrows")
            var myScroller = zenscroll.createScroller(myDiv, defaultDuration, edgeOffset)



            var base = 450;
            var step = 360;

                var underOffset = base;
                var preOffset = 0;
                var counterOffset = 0;
                while(!((accumulatedHeight < underOffset) && (accumulatedHeight >= preOffset)))
                {
                    underOffset = base+(counterOffset+1)*step;
                    preOffset = base+counterOffset*step;
                    counterOffset = counterOffset+1;
                    if(counterOffset > 200)
                    {
                        // just in case
                        break;
                    }
                }
                myScroller.toY(step*counterOffset,100);


        }





    }









    function moveInAccordion()
    {
        var currScreen =  _fleeqPlayer.currentScreen;


        document.querySelector('.currScreenIndication').innerHTML = currScreen;


        if(!pauseMode)
        {
            //playSectionAudio();
            //fillThisTimeLineSection(currScreen-1);
            syncAccordToRealTime();
        }
        else
        {
            clearAllHoverTimeLineColors();
            highlightPointOnTimeLine(currScreen-1);
            focusOnCurrentLeftItem();
        }




        var accumulatedHeight = 0 ;

        for (var i = 0; i < currScreen; i++) {
            accumulatedHeight = accumulatedHeight + document.getElementById("accord_cb_"+parseInt(i+1)).clientHeight;
        }


        var defaultDuration = 1700
        var edgeOffset = 10
        var myDiv = document.querySelector(".accordion.arrows")
        var myScroller = zenscroll.createScroller(myDiv, defaultDuration, edgeOffset)


        if( accumulatedHeight > 450  && (direction == 'i'))
        {
            myScroller.toY(400, 500, function(){

            });
        }

        if( (accumulatedHeight < 550) && (direction == 'o') )
        {
            //console.log('shouldScollUp')
            myScroller.toY(0);
        }

    }





    function setArrows()
    {
        var iframeE = document.getElementsByClassName("mobileMain")[0];
        var currScreen =  _fleeqPlayer.currentScreen;
        var numOfScreens =  _fleeqPlayer.numberOfScreens;
    //    leftArrowDiv.style.display = "block";
    //    rightArrowDiv.style.display = "block";
    //    if(currScreen == numOfScreens)
    //    {
    //        rightArrowDiv.style.display = "none";
    //    }
    //    if(currScreen == 1)
    //    {
    //        leftArrowDiv.style.display = "none";
    //    }
    }



    function heightForOverAccord()
    {
        var response = false;
        var accorrdPointer = document.querySelector('#main-content >  .desk.accordion');
        if( accorrdPointer != undefined)
        {
            var response = accorrdPointer.clientHeight;
        }


        return response;
    }


    function leftClicked( s )
    {


        if(!canTransit)
        {
            return;
        }



        canTransit = false;
        setTimeout(function(){canTransit = true;}, transitionDelay*.5);
        currBaseTimeInFleeq = (currTimeInSeconds() - 5)*1000;
        if(currBaseTimeInFleeq < 0)
            currBaseTimeInFleeq = 0;

        changeLocationOnTimeline(parseFloat(currBaseTimeInFleeq/time)*100, false);


        return ;






        canTransit = false;
        setTimeout(function(){canTransit = true;}, transitionDelay*1.5);
        var iframeE = document.getElementsByClassName("mobileMain")[0];
        if( iframeE != undefined) {

            _fleeqPlayer.moveToDirection(true);
            if(showArrows) {
                setArrows();
            }
            clearTimeout(loopPointer);
            loopPointer_cleared = true;

            if(s.localeCompare('h') == 0)
            {
                //if(accordionMode )
                {
                    removeAllTimeOuts();
                    muteAudio();
                    direction = 'o';
                    //if((info['product']['player_type'] == 2) || (info['product']['player_type'] == 4))

                    {
                         // moveInAccordionFullRightSide()
                    }
                    //else
                    //{
                    //    moveInAccordion();
                    //}

                }

                //if(single_quote)
                //{
                //    moveInAccordionFullRightSide()
                //}
            }
        }




    //    heightForOverAccord();
    }

    // function print_call_stack() {
    //     var stack = new Error().stack;
    //     console.log("PRINTING CALL STACK");
    //     console.log( stack );
    // }



    function runUserLike(code)
    {
        jQuery.getScript("//userlike-cdn-widgets.s3-eu-west-1.amazonaws.com/"+code+'.js', function(data, status, jqxhr) {

            if(info['info']['is_layout_rtl'] == 1)
            {

                $('.logo-top-bar.right').addClass('rightChat150');
            }
            else
            {
                if($('.CTAmainB').length > 0)
                {
                    $('.CTAmainB').css('margin-right','350px');
                }
            }

        });
    }


    function runLiveChat(code)
    {
        <!-- Start of LiveChat (www.livechatinc.com) code -->

    window.__lc = window.__lc || {};
        window.__lc.license = 9528785;
        (function() {
            var lc = document.createElement('script'); lc.type = 'text/javascript'; lc.async = true;
            lc.src = ('https:' == document.location.protocol ? 'https://' : 'http://') + 'cdn.livechatinc.com/tracking.js';
            var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(lc, s);
        })();

        <!-- End of LiveChat code -->
    }


    function runOlark(code)
    {
        <!-- begin olark code -->

    ;(function(o,l,a,r,k,y){if(o.olark)return;
        r="script";y=l.createElement(r);r=l.getElementsByTagName(r)[0];
        y.async=1;y.src="//"+a;r.parentNode.insertBefore(y,r);
        y=o.olark=function(){k.s.push(arguments);k.t.push(+new Date)};
        y.extend=function(i,j){y("extend",i,j)};
        y.identify=function(i){y("identify",k.i=i)};
        y.configure=function(i,j){y("configure",i,j);k.c[i]=j};
        k=y._={s:[],t:[+new Date],c:{},l:a};
    })(window,document,"static.olark.com/jsclient/loader.js");
        /* Add configuration calls below this comment */
        olark.identify(code);

        if(info['info']['is_layout_rtl'] == 1)
        {

            $('.logo-top-bar.right').addClass('rightChat150');
        }
        else
        {
            if($('.CTAmainB').length > 0)
            {
                $('.CTAmainB').css('margin-right','200px');
            }
        }
    }




    function runCrisp(code)
    {
        window.$crisp=[];window.CRISP_WEBSITE_ID=code;(function(){d=document;s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();
        if(info['info']['is_layout_rtl'] == 1)
        {

            $('.logo-top-bar.right').addClass('rightChat');
        }
        else
        {
            if($('.CTAmainB').length > 0)
            {
                $('.CTAmainB').css('margin-right','100px');
            }
        }
    }

    function runConvertFox(code)
    {
        (function(d,h,w){var convertfox=w.convertfox=w.convertfox||[];convertfox.methods=['trackPageView','identify','track','setAppId'];convertfox.factory=function(t){return function(){var e=Array.prototype.slice.call(arguments);e.unshift(t);convertfox.push(e);return convertfox;}};for(var i=0;i<convertfox.methods.length;i++){var c=convertfox.methods[i];convertfox[c]=convertfox.factory(c)}s=d.createElement('script'),s.src="//assets.convertfox.com/convertfox.min.js",s.async=!0,e=d.getElementsByTagName(h)[0],e.appendChild(s),s.addEventListener('load',function(e){},!1),convertfox.setAppId(code),convertfox.trackPageView()})(document,'head',window);

        if(info['info']['is_layout_rtl'] == 1)
        {

            $('.logo-top-bar.right').addClass('rightChat');
        }
        else
        {
            if($('.CTAmainB').length > 0)
            {
                $('.CTAmainB').css('margin-right','100px');
            }
        }
    }

    function runDrift(code)
    {
        !function() {
            var t;
            if (t = window.driftt = window.drift = window.driftt || [], !t.init) return t.invoked ? void (window.console && console.error && console.error("Drift snippet included twice.")) : (t.invoked = !0,
                t.methods = [ "identify", "config", "track", "reset", "debug", "show", "ping", "page", "hide", "off", "on" ],
                t.factory = function(e) {
                    return function() {
                        var n;
                        return n = Array.prototype.slice.call(arguments), n.unshift(e), t.push(n), t;
                    };
                }, t.methods.forEach(function(e) {
                t[e] = t.factory(e);
            }), t.load = function(t) {
                var e, n, o, i;
                e = 3e5, i = Math.ceil(new Date() / e) * e, o = document.createElement("script"),
                    o.type = "text/javascript", o.async = !0, o.crossorigin = "anonymous", o.src = "https://js.driftt.com/include/" + i + "/" + t + ".js",
                    n = document.getElementsByTagName("script")[0], n.parentNode.insertBefore(o, n);
            });
        }();
        drift.SNIPPET_VERSION = '0.3.1';
        drift.load(code);
        drift.on('ready',function(api, payload) {
                // api.widget.hide();
                //  api.sidebar.open();
                // drift.on('sidebarClose',function(e){
                //     if(e.data.widgetVisible){
                //         api.widget.hide()
                //     }
                // })

        })



        // driftObserver.observe(document.body, {childList: true, subtree: true, attributes: true});
    }









var driftObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation, index){
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(function(item, index)
            {

                if (item.id === 'drift-widget-container') {

                    if(info['info']['is_layout_rtl'] == 1)
                    {
                        if($('.CTAmainB').length > 0)
                        {
                            // $('.CTAmainB').css('margin-left','150px');
                        }
                        // createObserver(document.getElementById('launcher'));
                         $('.logo-top-bar.right').addClass('rightChat');
                    }
                    else
                    {
                        if($('.CTAmainB').length > 0)
                        {
                            $('.CTAmainB').css('margin-right','100px');
                        }
                    }
                }

            });
        }
    });
});








function runZendesk(code)
    {
    /*<![CDATA[*/
    window.zEmbed||function(e,t){
        var n,o,d,i,s,a=[],r=document.createElement("iframe");
        window.zEmbed=function(){
            a.push(arguments)
        },
            window.zE=window.zE||window.zEmbed,
            r.src="javascript:false",
            r.title="",
            r.role="presentation",
            (r.frameElement||r).style.cssText="display: none",
            d=document.getElementsByTagName("script"),
            d=d[d.length-1],
            d.parentNode.insertBefore(r,d),
            i=r.contentWindow,
            s=i.document;

        try{o=s}
        catch(e)
        {
            n=document.domain,
                r.src='javascript:var d=document.open();d.domain="'+n+'";void(0);',
                o=s
        }
        o.open()._l=function()
        {
            var e=this.createElement("script");
            n&&(this.domain=n),
                e.id="js-iframe-async",
                e.src="https://assets.zendesk.com/embeddable_framework/main.js",
                this.t=+new Date,this.zendeskHost="elasticodehelp.zendesk.com",
                this.zEQueue=a,this.body.appendChild(e)},
            o.write('<body onload="document._l();">'),
            o.close()}();
        /*]]>*/

            zendeskObserver.observe(document.body, {childList: true, subtree: true, attributes: true});


    }




// function findZendesk(item, index)
// {
//     if (item.id === 'launcher') console.log(item);
//     $('#launcher.zEWidget-launcher').addClass('toTheLeft');
//     $('.zEWidget-webWidget.zEWidget-webWidget--active').addClass('toTheLeft');
//     $('#launcher.zEWidget-launcher').fadeIn('fast');
// }

// var element = document.querySelector('#launcher.zEWidget-launcher');
//
//
// var in_dom = document.body.contains(element);


var foundZendeskElements = 0;
var zendeskObserver = new MutationObserver(function(mutations) {
         mutations.forEach(function(mutation, index){
             if (mutation.type === 'childList') {
                 mutation.addedNodes.forEach(function(item, index)
                 {
                     if (item.id === 'launcher') {
                         foundZendeskElements =foundZendeskElements+1;
                         if(info['info']['is_layout_rtl'] == 1)
                         {

                                 $('.logo-top-bar.right').addClass('rightChat150');

                             // createObserver(document.getElementById('launcher'));
                         }
                         else
                         {
                             if($('.CTAmainB').length > 0)
                             {
                                 $('.CTAmainB').css('margin-right','150px');
                             }
                         }
                     }
                     if (item.id === 'webWidget') {
                         // console.log(item);
                         if(info['info']['is_layout_rtl'] == 1) {
                             // createObserver(document.getElementById('webWidget'));
                         }
                         foundZendeskElements = foundZendeskElements+1;
                     }

                     if(foundZendeskElements == 2)
                     {
                         zendeskObserver.disconnect();
                     }
                 });
             }
         });
});




function createObserver(elm)
{
    var firstElmObserver = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            var newVal = $(mutation.target).prop(mutation.attributeName);
            if (mutation.attributeName === "class") {
                // console.log("MutationObserver class changed to", newVal);
                // console.log(elm);
                if(elm.id == 'webWidget')
                {
                    // $('#webWidget').addClass('toTheLeft');
                }
                else
                {
                    // $('#launcher').addClass('toTheLeft');
                }

            } else if (mutation.attributeName === "id") {
                // console.log("MutationObserver id changed to", newVal);
            }
        });
    });


    var observerConfig = {
        attributes: true,
        childList: true,
        characterData: true
    };

    firstElmObserver.observe(elm, observerConfig);
}





    function runIntercom(code)

    {



    window.intercomSettings = {
        app_id: code
    };


        var w=window;
        var ic=w.Intercom;
        if(typeof ic==="function"){
            ic('reattach_activator');
            ic('update',intercomSettings);
        }else{
            var d=document;
            var i=function(){
                i.c(arguments)};
            i.q=[];
            i.c=function(args){
                i.q.push(args)};
            w.Intercom=i;
            function l(){
                var s=d.createElement('script');
                s.type='text/javascript';
                s.async=true;s.src='https://widget.intercom.io/widget/'+code;
                var x=d.getElementsByTagName('script')[0];
                x.parentNode.insertBefore(s,x);
            }
            l();
        };



        if($('.CTAmainB').length > 0)
        {
            $('.CTAmainB').css('margin-right','100px');
        }

        if(info['info']['is_layout_rtl'] == 1)
        {

                $('.logo-top-bar.right').addClass('rightChat');

        }

        setTimeout(function(){
            getHeightForBottomSection();
        },1000);
    }

    function runGA(code)
    {
        $.getScript( "https://www.google-analytics.com/analytics.js" )
            .done(function( script, textStatus ) {
                ga('create', code, 'auto');
                thirdPartyAnalyticsDone = true;
            })
            .fail(function( jqxhr, settings, exception ) {
                thirdPartyAnalytics = false;
                thirdPartyAnalyticsDone = true;
            });
    }

    function runMixPanel(code)
    {
        (function(e,a){if(!a.__SV){var b=window;try{var c,l,i,j=b.location,g=j.hash;c=function(a,b){return(l=a.match(RegExp(b+"=([^&]*)")))?l[1]:null};g&&c(g,"state")&&(i=JSON.parse(decodeURIComponent(c(g,"state"))),"mpeditor"===i.action&&(b.sessionStorage.setItem("_mpcehash",g),history.replaceState(i.desiredHash||"",e.title,j.pathname+j.search)))}catch(m){}var k,h;window.mixpanel=a;a._i=[];a.init=function(b,c,f){function e(b,a){var c=a.split(".");2==c.length&&(b=b[c[0]],a=c[1]);b[a]=function(){b.push([a].concat(Array.prototype.slice.call(arguments,
        0)))}}var d=a;"undefined"!==typeof f?d=a[f]=[]:f="mixpanel";d.people=d.people||[];d.toString=function(b){var a="mixpanel";"mixpanel"!==f&&(a+="."+f);b||(a+=" (stub)");return a};d.people.toString=function(){return d.toString(1)+".people (stub)"};k="disable time_event track track_pageview track_links track_forms register register_once alias unregister identify name_tag set_config reset people.set people.set_once people.unset people.increment people.append people.union people.track_charge people.clear_charges people.delete_user".split(" ");
        for(h=0;h<k.length;h++)e(d,k[h]);a._i.push([b,c,f])};a.__SV=1.2;b=e.createElement("script");b.type="text/javascript";b.async=!0;b.src="undefined"!==typeof MIXPANEL_CUSTOM_LIB_URL?MIXPANEL_CUSTOM_LIB_URL:"file:"===e.location.protocol&&"//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js".match(/^\/\//)?"https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js":"//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js";c=e.getElementsByTagName("script")[0];c.parentNode.insertBefore(b,c)}})(document,window.mixpanel||[]);
        mixpanel.init(code);
        thirdPartyAnalyticsDone = true;
    }


    function moveOn()
    {
        if(!canTransit)
        {
            return;
        }

         removeAllTimeOuts();

        var iframeE = document.getElementsByClassName("mobileMain")[0];
        var currScreen =  _fleeqPlayer.currentScreen;


        _pingTrack();

        if( iframeE != undefined) {



            var finalScreen = _fleeqPlayer.numberOfScreens;
            var currScreen = _fleeqPlayer.currentScreen;


            if ((currScreen == finalScreen) && !postSplashOn) {

                addPostScreen();

            }
            else
            {
                _fleeqPlayer.moveToDirection(false);

                canTransit = false;
                setTimeout(function(){canTransit = true;}, transitionDelay*1.5);

                // var currScreen =  _fleeqPlayer.currentScreen;
                continueRunningStep(currScreen);
            }

        }

    }



    function jumpToSpecificTimeOnTimeline(startAtSpecificTime)
    {
        if(!canTransit)
        {
            return;
        }


        // removeAllTimeOuts();
        canTransit = false;
        setTimeout(function(){canTransit = true;}, transitionDelay*0.5);
        currBaseTimeInFleeq = startAtSpecificTime*1000;
        if(currBaseTimeInFleeq > time)
            currBaseTimeInFleeq = time;

        goToSpecifcSectionInTimeline();

    }


    function rightClicked(s)
    {



        if(!canTransit)
        {
            return;
        }





        // removeAllTimeOuts();
        canTransit = false;
        setTimeout(function(){canTransit = true;}, transitionDelay*.5);
        currBaseTimeInFleeq = (currTimeInSeconds() + 5)*1000;
        if(currBaseTimeInFleeq > time)
            currBaseTimeInFleeq = time;


        changeLocationOnTimeline(parseFloat(currBaseTimeInFleeq/time)*100, false);

        return ;


        //canTransit = false;
        //setTimeout(function(){canTransit = true;}, transitionDelay*1.5);
        //var iframeE = document.getElementsByClassName("mobileMain")[0];
        //
        //if( iframeE != undefined)
        //{
        //
        //
        //
        //    var finalScreen = _fleeqPlayer.numOfScreens;
        //    var currScreen =  _fleeqPlayer.currentScreen;
        //
        //        track('i-guide', currScreen, false);
        //
        //        if((currScreen == finalScreen) && !postSplashOn)
        //    {
        //
        //         addPostScreen();
        //
        //    }
        //    else
        //    {
        //        iframeE.contentDocument.getElementsByClassName("push")[0].click();
        //
        //        if(showArrows)
        //        {
        //            setArrows();
        //        }
        //
        //        if( s != undefined)
        //        {
        //            if(s.localeCompare('h') == 0)
        //            {
        //                clearTimeout(loopPointer);
        //                loopPointer_cleared = true;
        //            }
        //        }
        //
        //        //if(accordionMode)
        //        //{
        //            removeAllTimeOuts();
        //            muteAudio();
        //            direction = 'i';
        //            //if((info['product']['player_type'] == 2) || (info['product']['player_type'] == 4))
        //            {
        //                     continueRunningStep(currScreen);
        //                 // moveInAccordionFullRightSide()
        //            }
        //            //else
        //            //{
        //            //    moveInAccordion();
        //            //}
        //
        //        //}
        //
        //        //if(single_quote)
        //        //{
        //        //    moveInAccordionFullRightSide()
        //        //}
        //    }
        //
        //
        //}




    //    heightForOverAccord();

    }







    function autoplay(autorewined)
    {
        var maxRepeat =  _fleeqPlayer.numberOfScreens;



        var counter = 1;

            (function autoplayFunc() {

                if(loopPointer_cleared)
                {
                    clearTimeout(loopPointer);
                    return;
                }

                var delay = 3000;

                rightClicked('a');
                counter = counter+1;

                if ( counter == maxRepeat ) {
                    clearTimeout(loopPointer);

                    if(shouldRewind)
                    {
                        setTimeout(rewined, 3000);
                    }


                } else {
                    loopPointer = setTimeout(autoplayFunc, delay);
                    loopPointer_cleared = false;

                }
            })();

    }



    function rewined()
    {

        var maxRepeat =  _fleeqPlayer.numberOfScreens;
        var delay = 400;
        var counter = 1;
        var extraWait = parseInt(400*maxRepeat + 3000);


        (function rewindFlow() {
            leftClicked('a');
            maxRepeat = maxRepeat-1;

            if ( counter == maxRepeat ) {
                clearTimeout(loopPointerRewind);
                if(shouldLoop)
                {
                    setTimeout(function(){autoplay(false)}, extraWait);
                }

            } else {
                loopPointerRewind = setTimeout(rewindFlow, delay);
            }
        })();
    }







    function muteAudio()
    {



        if(!isMobileDevice)
        {
            // var muted = currAudio.muted;


            if(!currAudio)
            {
                return;
            }
            var muted = currAudio.mute();


            if(muted)
            {
                currAudio.fade(0.0, 1.0, 200);
            }
            else
            {
                currAudio.fade(1.0, 0.0, 200);
            }

            // $(currAudio).animate({volume: muted ? 1 : 0}, 200, function() {
            //     if(volumeOff)
            //     {
            //         currAudio.volume = 0;
            //
            //     }
            // });
        }

        if(isInIframe)
        {
            // var muted = currAudio.muted;
            if(currAudio)
            {
                var muted = currAudio.mute();

                if(muted)
                {
                    currAudio.fade(0.0, 1.0, 200);
                }
                else
                {
                    currAudio.fade(1.0, 0.0, 200);
                }
            }



            // $(currAudio).animate({volume: muted ? 1 : 0}, 200, function() {
            //     if(volumeOff)
            //     {
            //         currAudio.volume = 0;
            //     }
            // });
        }

    }


    function removeAllTimeOuts()
    {
        for(var i = 0 ; i < allTimeOuts.length ; i++)
        {
            clearTimeout(allTimeOuts[i]);
        }

        allTimeOuts = [];
    }



    function finalizeModalRemove()
    {
        clearTimeout(loopPointer);
        clearTimeout(loopPointerRewind);
        cleaningDOM();
        removeAllTimeOuts();
        muteAudio();
        splashOn = true;
        allMute = false;
        pauseMode = false;
        postSplashOn = false;
        notFirstTime = false;
        document.onkeydown = null;
        invideo = false;
        didFrameLoad = false;
        fullAudioFileLoaded = false;
        loaded = 0;
    }

    function killModal()
    {

        if(!liveModal)
        {
            return 0;
        }

        // if(currAudio.duration > 0)
        if(currAudio.seek() > 0)
        {
            currAudio.pause();
        }
        liveModal = false;
        //if(modal)
        //{
        //    modal.style.display = "none";
        //}


        if($('#ec_exp').length > 0 )
        {
            $('#ec_exp').fadeOut('fast', function(){
                finalizeModalRemove();

            })
        }
        else
        {
            finalizeModalRemove();
        }

    }
    function hasClass(el, className) {
        if (el.classList)
            return el.classList.contains(className)
        else
            return !!el.className.match(new RegExp('(\\s|^)' + className + '(\\s|$)'))
    }

    function addClass(el, className) {
        if (el.classList)
            el.classList.add(className)
        else if (!hasClass(el, className)) el.className += " " + className
    }

    function removeClass(el, className) {
        if (el.classList)
            el.classList.remove(className)
        else if (hasClass(el, className)) {
            var reg = new RegExp('(\\s|^)' + className + '(\\s|$)')
            el.className=el.className.replace(reg, ' ')
        }
    }



    function preloadImages(array) {
        if (!preloadImages.list) {
            preloadImages.list = [];
        }
        var list = preloadImages.list;
        for (var i = 0; i < array.length; i++) {
            var img = new Image();
            img.onload = function() {
                var index = list.indexOf(this);
                if (index !== -1) {
                    // remove image from the array once it's loaded
                    // for memory consumption reasons
                    list.splice(index, 1);
                }
            }
            list.push(img);
            img.src = array[i];
        }
    }


    function closest(el, selector) {
        var matchesFn;

        // find vendor prefix
        ['matches','webkitMatchesSelector','mozMatchesSelector','msMatchesSelector','oMatchesSelector'].some(function(fn) {
            if (typeof document.body[fn] == 'function') {
                matchesFn = fn;
                return true;
            }
            return false;
        })

        var parent;

        // traverse parents
        while (el) {
            parent = el.parentElement;
            if (parent && parent[matchesFn](selector)) {
                return parent;
            }
            el = parent;
        }

        return null;
    }


    function addListenerMulti(el, s, fn) {
        var evts = s.split(' ');
        for (var i=0, iLen=evts.length; i<iLen; i++) {
            el.addEventListener(evts[i], fn, false);
        }
    }



    function clickedOverlayIframe()
    {
    // $(document).on("click", ".overlayIframe", function() {


        if(isGif)
            return;

        if(realMobile)
        {
            if(pauseMode)
            {
                fullNarrationFile.play();
                moveToPlay(true);
            }
            else
                moveToPause(true);
        }
        else
        {

            if(pauseMode)
                moveToPlay(true);
            else
                moveToPause(true);


            // if($('.tl-over').width() > 0)
            // {
            //     if(!pauseMode)
            //         moveToPause(true);
            // }
            // else
            // {
            //     if(pauseMode)
            //         moveToPlay(true);
            // }
        }



    };


    // $(document).on("dblclick", ".overlayIframe", function() {
    //     pauseAndOpenFullScreen();
    //
    // })




    $(document).on("click", ".select.localization-div-select .placeholder", function() {

            var parent = $(this).closest(".select");
            if (!parent.hasClass("is-open")) {
                parent.addClass("is-open");
                $(".select.is-open")
                    .not(parent)
                    .removeClass("is-open");
            } else {
                parent.removeClass("is-open");
            }
        })


    var firstTimeSemaphore = false;

    $(document).on("click", ".select.localization-div-select ul>li", function() {
            var parent = $(this).closest(".select");

            $(".select.localization-div-select ul>li").removeClass('checkedLanguage');
            $(this).addClass('checkedLanguage');

            parent
                .removeClass("is-open")
                .find(".placeholder")
                .text($(this).text());
            parent.find("input[type=hidden]").attr("value", $(this).attr("data-value"));

            if(firstTimeSemaphore)
                $(this).closest('.localization-div-select').trigger('change');

        firstTimeSemaphore = true;
        });




    $('.select.localization-div-select').change(function(){
        var data= $(this).val();
    });


    function loadHeadline()
    {
    //    var headlineElm =  document.querySelector('.preInfo .headline');


        var exstyle = '';
        var exstyle_2 = '';
        if(isMobileDevice)
        {
            w = mobileScreenWidth;
            leftpos = (parseFloat(w) - 40) / 2
            if(w > 1000)
            {
                leftpos = (parseFloat(w) - 120) / 2
            }
            // exstyle = 'left:'+leftpos+'px; top:155px;';
            exstyle_2 = 'width:'+w+'px;margin-top:60px;';
        }

        var headlineCode = '<div class="headline animated fadeInUp truncate" style="'+exstyle_2+'" > '+displayName+'</div>';
        // $('.preInfo').append(headlineCode);


        var  startPlayMobile = '';
        var extraFleeqDataForMobile = '';


        // add localization


        localizationSelect = '';
        if(info['localization'] && !isMobileDevice)
        {
            var contentString = '';
            var allLang = info['localization']['languages'];
            var keys = [];
            for(var k in allLang) keys.push(k);
            for(var i = 0 ; i < keys.length ; i++)
            {
                contentString = contentString+'<li data-id="'+allLang[keys[i]]['lID']+'"   data-value="'+allLang[keys[i]]['code_key']+'">'+allLang[keys[i]]['name']+'</li>';
            }
            localizationSelect = '<div class="localization-div"><div class="select localization-div-select">'+
                '  <span class="placeholder"></span>'+
                '  <ul>'+contentString+'  </ul>'+
                '  <input type="hidden" name="changeme"/>'+
                '</div></div>';
        }



        if(isMobileDevice && !isInIframe)
        {

            $('.headline.animated.fadeInUp.truncate').addClass('truncateMobile')
            startPlayMobile = 'mobile'

            var ctaRtlClass = '';
            if(info['header_rtl'] == 1)
            {
                ctaRtlClass = 'rtl';

            }

            extraFleeqDataForMobile = '<div class="text-center data-splash-mobile '+ctaRtlClass+'">'+displayName+'<div>'+msToTime(info['info']['guide_duration'])+'</div></div>';


            if(info['localization'] )
            {
                var contentString = '';
                var allLang = info['localization']['languages'];
                var keys = [];
                for(var k in allLang) keys.push(k);
                for(var i = 0 ; i < keys.length ; i++)
                {
                    contentString = contentString+'<li data-id="'+allLang[keys[i]]['lID']+'"   data-value="'+allLang[keys[i]]['code_key']+'">'+allLang[keys[i]]['name']+'</li>';
                }
                var localizationSelectMobile = '<div class="localization-div"><div class="select localization-div-select">'+
                    '  <span class="placeholder"></span>'+
                    '  <ul>'+contentString+'  </ul>'+
                    '  <input type="hidden" name="changeme"/>'+
                    '</div></div>';


                extraFleeqDataForMobile = extraFleeqDataForMobile+localizationSelectMobile;

            }




        }



        //var wrapper= document.createElement('div');
        //wrapper.innerHTML= headlineCode;
        //var divNew = wrapper.firstChild;
        //var mainBG = document.getElementsByClassName('preInfo')[0];
        //mainBG.insertBefore(divNew , mainBG.childNodes[0] );

        var dur = calcVideoDuration();
        var headlineSub = '<div class="subline animated fadeInUp" >'+msToTime(info['info']['guide_duration'])+' '+info['info']['guide_duration_suffix']+'</div>';

        // $('.preInfo').append(headlineSub);

        //var wrapper= document.createElement('div');
        //wrapper.innerHTML= headlineSub;
        //var divNew = wrapper.firstChild;
        //var mainBG = document.getElementsByClassName('preInfo')[0];
        //mainBG.insertBefore(divNew , mainBG.childNodes[1] );








        var headlineCode = '<div class="wrapperForStartPlay"><div class="startPlay  '+startPlayMobile+'"  onclick="removeSplash()" style="'+exstyle+'">' +
    //        '<img src="http://exp-web-cdn.s3.amazonaws.com/playBPrefix.jpg">' +
                '<img src="https://s3-eu-west-1.amazonaws.com/guidez-thumbnails/'+info["env"]+'/'+info["thumbnailCode"]+'_play.svg" class="guidez3rdpjs-svgClass guidez3rdpjs-inlineSoloMini" style="width:120%; margin-top: 0px; margin-left: -13px;">'+

                // '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 14.82 16.92">' +
                //     '<defs>' +
                //         '<style>.cls-play-b{fill:url(#New_Gradient_Swatch_play);}</style>' +
                //         '<linearGradient id="New_Gradient_Swatch_play" y1="8.46" x2="14.82" y2="8.46" gradientUnits="userSpaceOnUse">' +
                //             '<stop offset="0" stop-color="'+grad_A+'"/>' +
                //             '<stop offset="1" stop-color="'+grad_B+'"/>' +
                //         '</linearGradient>' +
                //     '</defs>' +
                //     '<title>Asset 220eye</title>' +
                //     '<g id="Layer_2" data-name="Layer 2">' +
                //         '<g id="Layer_1-2" data-name="Layer 1">' +
                //             '<path class="cls-play-b" d="M14.5,7.9,1,.09A.65.65,0,0,0,0,.65V16.27a.65.65,0,0,0,1,.56L14.5,9A.65.65,0,0,0,14.5,7.9Z"/>' +
                //         '</g>' +
                //     '</g>' +
                // '</svg>'+
                '<div id="splashTimer" style="opacity: 0; display:none; color:'+grad_A+' !important; "><span>'+parseInt( (splashAutoPlatTimer/1000) - 1 )+'</span></div>'+
            '</div></div>'+localizationSelect+extraFleeqDataForMobile;

        if(isInIframe)
        {
            headlineCode = '<div class="startPlay '+startPlayMobile+'" onclick="removeSplash()" style="'+exstyle+'">' +
    //        '<img src="http://exp-web-cdn.s3.amazonaws.com/playBPrefix.jpg">' +
                '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 173.38 173.38">' +
                '<defs>' +
                    '<style>' +
                        '.cls-1{fill:url(#New_Gradient_Swatch_1_copy);}' +
                        '.cls-2{fill:#fff;}' +
                    '</style>' +
                    '<linearGradient id="New_Gradient_Swatch_1_copy" y1="86.69" x2="173.38" y2="86.69" gradientUnits="userSpaceOnUse">' +
                    '<stop offset="0" stop-color="'+grad_A+'"/>' +
                    '<stop offset="1" stop-color="'+grad_B+'"/>' +
                    '</linearGradient>' +
                '</defs>' +
                '<title>Play</title>' +
                '<g id="Layer_2" data-name="Layer 2">' +
                    '<g id="Layer_1-2" data-name="Layer 1">' +
                        '<rect class="cls-1" width="173.38" height="173.38" rx="86.69" ry="86.69"/>' +
                        '<path class="cls-2" d="M132.21,84.59,59,42.35a3.5,3.5,0,0,0-5.25,3v84.48a3.5,3.5,0,0,0,5.25,3l73.16-42.24A3.5,3.5,0,0,0,132.21,84.59Z"/>' +
                    '</g>' +
                '</g>' +
                '</svg>' +
                '</div>';






            $('.preInfo').prepend(headlineCode);

        }
        else
        {
            $('.preInfo').append(headlineCode);
            if(info['localization'])
                $('li[data-id="'+info['localization']['defaultLanguageID']+'"]').click();
        }

        //var wrapper= document.createElement('div');
        //wrapper.innerHTML= headlineCode;
        //var divNew = wrapper.firstChild;
        //var mainBG = document.getElementsByClassName('preInfo')[0];
        //mainBG.insertBefore(divNew , mainBG.childNodes[2] );



        // $('.wrapperForStartPlay').css('background-color', bg_C);



        var calcMarginTop = ($('.preInfo').height() - 128) / 2;
        $('.wrapperForStartPlay').css('margin-top', calcMarginTop+'px');




        $('#New_Gradient_Swatch_play > stop[offset="0"]').attr('stop-color', grad_A);
        $('#New_Gradient_Swatch_play > stop[offset="1"]').attr('stop-color', grad_B);





        var counterTimer = '<div id="counterToStart"></div>';
        var wrapper= document.createElement('div');
        wrapper.innerHTML= counterTimer;
        var divNew = wrapper.firstChild;
        var mainBG = document.getElementsByClassName('preInfo')[0];
        mainBG.insertBefore(divNew , mainBG.childNodes[3] );


        var keyboardIndication =
            '' +
            '<div id="keyboardSVG"><span id="aboveKeyboardIndication">You can also use your keyboard <br>to navigate</span>' +
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190.36 38">' +
                    '<defs>' +
                        '<style>.cls-1-kb{fill:#f2f2f2;}.cls-2-kb{fill:#ccc;}.cls-3-kb{opacity:0.2;}</style>' +
                    '</defs>' +
                    '<title>Use your keyboard</title>' +
                    '<g id="Layer_2" data-name="Layer 2">' +
                        '<g id="Layer_1-2" data-name="Layer 1">' +
                            '<rect class="cls-1-kb" x="172.17" y="19.54" width="18.18" height="18.18" rx="1.93" ry="1.93"/>' +
                            '<path class="cls-2-kb" d="M186.3,27.71l-7.65-4.42a1,1,0,0,0-1.49.86V33a1,1,0,0,0,1.49.86l7.65-4.42A1,1,0,0,0,186.3,27.71Z"/>' +
                            '<g class="cls-3-kb">' +
                                '<rect class="cls-1-kb" x="149.29" width="18.18" height="18.18" rx="1.93" ry="1.93" transform="translate(149.29 167.47) rotate(-90)"/>' +
                                '<path class="cls-2-kb" d="M157.46,4.05,153,11.7a1,1,0,0,0,.86,1.49h8.83a1,1,0,0,0,.86-1.49l-4.42-7.65A1,1,0,0,0,157.46,4.05Z"/>' +
                            '</g>' +
                            '<g class="cls-3-kb">' +
                                '<rect class="cls-1-kb" x="149.29" y="19.3" width="18.18" height="18.18" rx="1.93" ry="1.93" transform="translate(186.77 -129.99) rotate(90)"/>' +
                                '<path class="cls-2-kb" d="M159.3,33.43l4.42-7.65a1,1,0,0,0-.86-1.49H154a1,1,0,0,0-.86,1.49l4.42,7.65A1,1,0,0,0,159.3,33.43Z"/>' +
                            '</g>' +
                            '<rect class="cls-1-kb" x="127.64" y="19.54" width="18.18" height="18.18" rx="1.93" ry="1.93" transform="translate(273.47 57.27) rotate(180)"/>' +
                            '<path class="cls-2-kb" d="M131.69,29.56,139.34,34a1,1,0,0,0,1.49-.86V24.28a1,1,0,0,0-1.49-.86l-7.65,4.42A1,1,0,0,0,131.69,29.56Z"/>' +
                            '<rect class="cls-1-kb" y="20.18" width="109.01" height="17.82"/>' +
                        '</g>' +
                    '</g>' +
                 '</svg>' +
            '</div>';





        if(!isMobileDevice)
        {
            // var wrapper= document.createElement('div');
            // wrapper.innerHTML= keyboardIndication;
            // var divNew = wrapper.firstChild;
            // var mainBG = document.getElementsByClassName('preInfo')[0];
            // mainBG.insertBefore(divNew , mainBG.childNodes[4] );


        }
        else
        {

            if(!isInIframe)
            {
                readDeviceOrientation();


                $('#ec_exp').prepend('<div class="white-layer"></div>');
                $('#ec_exp iframe').css({'opacity': '0'})
            }
        }


        if(isInIframe)
        {


            var left = mobileScreenWidth/2 - 60;
            var top = mobileScreenHeight/2 - 60;




            var screenS = $('#modal-content').innerWidth();
            var screenS_Height = $('#modal-content').innerHeight();

            var left = screenS/2 - 60;
            var top = screenS_Height/2 - 60;


            $('.startPlay').css({ 'margin-left': left+'px'});
            $('.startPlay').css('margin-top', top+'px');

            $('.preInfo').css({'width': $('#modal-content').innerWidth()+'px'})
            $('.preInfo').css({'height':  $('#modal-content').innerHeight()+'px'})
            $('.preInfo').css({'background-color': 'transparent'})
            $('.preInfo').addClass('inFrame');
            $('.preInfo').prepend('<div class="bgTransparent"></div>');
            $('.preInfo').prepend('<div class="pass"></div>');
            // $('.preInfo').prepend('<div class="attr"><span>Powered by:</span><img src="/assets/images/acadamy/guidezAttrib.png"></div>');
            $('.preInfo.inFrame .pass').css('left',(mobileScreenWidth+20)+'px');
            $('.preInfo.inFrame .pass').css('width',( frameWidth*(4/10) )+'px');
            setGradiantOnSelector( $('.preInfo.inFrame .pass'), grad_A, grad_B);
            // $('.bgTransparent').css('width', mobileScreenWidth+'px');
            // $('.bgTransparent').css('height', ( mobileScreenHeight -20 )+'px');
            $('.preInfo .headline').addClass('inFrame');
            $('.preInfo .headline').css('width','auto');

            left = mobileScreenWidth/2 - 35;
            var leftAbsolute = mobileScreenWidth + 30;

            $('.preInfo .headline').css('margin-left',left+'px');
            $('.preInfo .subline').addClass('inFrame');
            $('.preInfo .subline').css('left',leftAbsolute  +'px');



            if(inVidRecording)
            {
                $('#main-content').css('margin-top','0px');
                $('#main-content').addClass('vidRec')
            }
        }

        if(isMobileDevice)
        {
            $('.preInfo').css({'margin-top': '0px'})
        }






    //    addListenerMulti(document.querySelector('.preInfo') , 'webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', loadVideoAfterSplash );


    }

    $(document).on("click", ".close-draft-window", function(){

        window.close();
    })


    $(document).on("click", ".courseItem", function(){

        runNxtGuideInCourse($(this).data('index-item'));
    })


    $(document).on("click", ".closeModalInPostInfo", function(){

        killModal();
    })

    $(document).on("click", ".closeModalInPostInfoText", function(){

        // jumpToScreen()

        if(info['in_course'])
        {

        }
        else
        {
            addPostScreen();
        }
        // killModal();
    })



    var inPauseBeforeBlur = false;
    var inBlurMode = false;


    if(typeof soundManager !== 'undefined')
    soundManager.fadeTo = function(id, dur, toVol, callback){
        dur      = dur || 1000;
        toVol    = toVol || 0;
        callback = typeof callback == 'function' ? callback : function(){};
        var s    = soundManager.getSoundById(id),
            k    = s.volume,
            t    = dur/Math.abs(k - toVol),
            i    = setInterval(function(){
                k = k > toVol ? k - 1 : k + 1;
                s.setVolume(k);
                if(k == toVol){
                    callback.call(this);
                    clearInterval(i);
                    i = null;
                }
            }, t);
    }

    function onBlur() {

        inBlurMode = true;
        if(pauseMode)
        {
            inPauseBeforeBlur = true;
        }
        else
        {
             // moveToPause();
        }
    }

    function onFocus(){



         if($('.fullOverPost').length > 0 || $("#flow-options").hasClass("active"))
            return;

          // var jumpTo = sm_timer_position;
          if(!inPauseBeforeBlur && !splashOn)
          {
              moveToPlay(false);
              changeLocationOnTimeline(parseFloat((sm_timer_position+500)/time)*100, true);

          }

            // soundManager.fadeTo('fullAudioFile',50,0, function(){
            //     soundManager.fadeTo('fullAudioFile',50,100);
            // });


        inBlurMode = false;
    }

    if (/*@cc_on!@*/false) { // check for Internet Explorer
        document.onfocusin = onFocus;
        document.onfocusout = onBlur;
    } else {
        window.onfocus = onFocus;
        window.onblur = onBlur;
    }




    var clickedPlayOnMobile  = false;
    function removeSplashAfterClick()
    {


         if(realMobile)
        {
            // fullNarrationFile.load();
             soundManager.play('fullAudioFile');
            // soundManager.setVolume('fullAudioFile' , 0);
            soundManager.pause('fullAudioFile');
            // soundManager.load('fullAudioFile',{ volume:50 , onload:function(){this.play()} });
            $(arrayOfVids).each(function(index, videoData){
                if(videoData){
                    videoData['element'].play();
                    videoData['element'].pause();
                }
            });
            $('.wrapperForStartPlay').fadeOut('fast',function(){
                clickedPlayOnMobile  = true;
                $('.wrapperForStartPlay').remove();

                $('.loader-2').css('display',"block");

            })
            return;
        }




        if($('.wrapperForStartPlay').length > 0)
        {
            soundManager.play('fullAudioFile');
            // soundManager.setVolume('fullAudioFile' , 0);
            soundManager.pause('fullAudioFile');
            $('.wrapperForStartPlay').fadeOut('fast',function(){
                removeSplash();
            })


        }
    }


    function startFlowAfterSplash()
    {






        if(inVideoRecording) {

            var extraClassRecording = '';
            if(inVideoRecording)
                extraClassRecording = 'inRec';
            var htmlForAttribution = '<div class="logo-attribution-video-wrapper '+extraClassRecording+'">' +
                '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 108.15 40.24"><defs><linearGradient id="linear-gradient" x1="54.08" y1="40.24" x2="54.08" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#f1f2f2"/><stop offset="1" stop-color="#fff"/></linearGradient></defs><title>fleeq_1_attribution</title><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><rect width="108.15" height="40.24" rx="20.12" ry="20.12" style="fill:url(#linear-gradient)"/><path d="M27.78,10a2.66,2.66,0,0,0-.59,2v1.59h3.62a1.06,1.06,0,0,1,1.12,1.12,1.09,1.09,0,0,1-1.12,1.13H27.19V27.21a1.23,1.23,0,0,1-.39.92,1.27,1.27,0,0,1-.94.38,1.25,1.25,0,0,1-.92-.37,1.23,1.23,0,0,1-.38-.93V15.87H22.85a1.14,1.14,0,0,1-1.13-1.13,1.1,1.1,0,0,1,.33-.81,1.13,1.13,0,0,1,.8-.32h1.71V11.93a5.9,5.9,0,0,1,.62-2.85,4,4,0,0,1,1.62-1.62A4.58,4.58,0,0,1,28.89,7a5.52,5.52,0,0,1,2.52.58,1.27,1.27,0,0,1,.47.42,1,1,0,0,1,.19.59,1.08,1.08,0,0,1-.31.77,1,1,0,0,1-.76.33,3.13,3.13,0,0,1-.66-.08l-.78-.09A2.51,2.51,0,0,0,27.78,10Z" style="fill:#304159"/><path d="M36.18,7.47a1.29,1.29,0,0,1,.37,1l0,18.78a1.25,1.25,0,0,1-.39.93,1.3,1.3,0,0,1-.94.37,1.27,1.27,0,0,1-.93-.37,1.26,1.26,0,0,1-.37-.93l0-18.78a1.31,1.31,0,0,1,.37-.94,1.25,1.25,0,0,1,.93-.39A1.32,1.32,0,0,1,36.18,7.47Z" style="fill:#304159"/><path d="M51.38,25.48a1.09,1.09,0,0,1,.35.81A1.25,1.25,0,0,1,51,27.36a11.13,11.13,0,0,1-2.22,1,10.58,10.58,0,0,1-2.84.32,7.39,7.39,0,0,1-5.51-2,7.71,7.71,0,0,1-2-5.65,9.43,9.43,0,0,1,.75-3.79,6.41,6.41,0,0,1,2.31-2.81,6.59,6.59,0,0,1,3.85-1.08,6.67,6.67,0,0,1,3.7,1A6.37,6.37,0,0,1,51.4,17a8.19,8.19,0,0,1,.81,3.63,1.27,1.27,0,0,1-1.33,1.3H41.07a4.77,4.77,0,0,0,1.51,3.15,5.21,5.21,0,0,0,3.56,1.13,8.44,8.44,0,0,0,2.13-.24,8.72,8.72,0,0,0,1.78-.66,1.08,1.08,0,0,1,.52-.12A1.17,1.17,0,0,1,51.38,25.48Zm-8-9.5a4,4,0,0,0-1.59,1.41,4.74,4.74,0,0,0-.72,2.37h8.54a4.71,4.71,0,0,0-.74-2.37A4,4,0,0,0,47.26,16a4.41,4.41,0,0,0-3.88,0Z" style="fill:#304159"/><path d="M67,25.46a1,1,0,0,1,.35.81,1.24,1.24,0,0,1-.75,1.07,10,10,0,0,1-2.23,1,10.45,10.45,0,0,1-2.83.32,7.38,7.38,0,0,1-5.51-2,7.69,7.69,0,0,1-2-5.66,9.46,9.46,0,0,1,.75-3.79,6.46,6.46,0,0,1,2.31-2.81A6.66,6.66,0,0,1,61,13.29a6.77,6.77,0,0,1,3.7,1,6.57,6.57,0,0,1,2.38,2.66,8.19,8.19,0,0,1,.81,3.63,1.27,1.27,0,0,1-1.33,1.31H56.72A4.79,4.79,0,0,0,58.23,25a5.19,5.19,0,0,0,3.56,1.12,8.82,8.82,0,0,0,2.12-.23,8.91,8.91,0,0,0,1.78-.67,1.28,1.28,0,0,1,.52-.12A1.17,1.17,0,0,1,67,25.46ZM59,16a3.81,3.81,0,0,0-1.59,1.4,4.8,4.8,0,0,0-.72,2.37h8.53a4.53,4.53,0,0,0-.74-2.38,4,4,0,0,0-1.6-1.4A4.54,4.54,0,0,0,61,15.51,4.67,4.67,0,0,0,59,16Z" style="fill:#304159"/><path d="M73.31,27.7A6.86,6.86,0,0,1,70.71,25a8.08,8.08,0,0,1-1-4.09,8.08,8.08,0,0,1,1-4.1,6.86,6.86,0,0,1,2.6-2.66,6.76,6.76,0,0,1,3.4-.92,6.64,6.64,0,0,1,5,2.2v-.76a1.23,1.23,0,0,1,.39-.92,1.31,1.31,0,0,1,.94-.38,1.26,1.26,0,0,1,.92.38,1.22,1.22,0,0,1,.38.92l0,19.07a1.28,1.28,0,0,1-.38.94,1.22,1.22,0,0,1-.92.39,1.3,1.3,0,0,1-1.33-1.33V26.4a6.69,6.69,0,0,1-5,2.21A6.8,6.8,0,0,1,73.31,27.7Zm.33-10.61a5.36,5.36,0,0,0-1.3,3.85,5.39,5.39,0,0,0,1.3,3.85,4.55,4.55,0,0,0,3.45,1.36,5.39,5.39,0,0,0,2.5-.6A7,7,0,0,0,81.66,24V17.9a7.21,7.21,0,0,0-2.07-1.58,5.51,5.51,0,0,0-2.5-.59A4.55,4.55,0,0,0,73.64,17.09Z" style="fill:#304159"/></g></g></svg>' +
                '</div>';

           
            if(typeof whiteLabel === 'undefined') {
                if (info['f_attr'] == 1)
                    $('#main-content').append(htmlForAttribution);
            }
            else
            {
                if (whiteLabel);
                else {
                    if (info['f_attr'] == 1)
                        $('#main-content').append(htmlForAttribution);
                }
            }
        }

        if(inVideoRecording ) {

            var user_string = info['info']['userString'];



            var htmlForCreatorAttribution = '<div class="creator-attribution-video-wrapper"><div class="creator-attribution-video-wrapper-content">Created by '+user_string+'</div></div>';

            // creator attribution
            if(creatorAttribution)
            {
                $('#main-content').append(htmlForCreatorAttribution);
            }

        }

        splashOn = false;





            var rightDiv = '<div id="single-quote" class="isMobile">' +
                    '<div class="content-wrapper">' +
                        '<span class="content  "></span>' +
                    '</div>' +
                '</div>';
            $('#modal-content').after(rightDiv);
            $('#single-quote').addClass('isIframe')
            $('#single-quote').css('opacity', '1');

            if(info['info']['is_rtl'] == '1')
            {
                $('#single-quote').addClass('rtl');
            }




            if(realMobile)
            {
                $('#single-quote').css('opacity', '1');
                readDeviceOrientation();
            }


            $('#single-quote .content').css({'font-size': '1.4rem'});
            $('#single-quote .content').css({'line-height': '1.9rem'});
            $('#single-quote .content').css({'top': '0px'});
            $('#single-quote .content').css({'color': '#fff'});
            $('#single-quote .content').css({'background-color': '#111111'});
            $('#single-quote .content').css({'display': 'inline'});
            $('#single-quote .content').css({'padding': '2px'});
            $('#single-quote .content').css({'border-radius': '2px'});
            $('#single-quote .content').css({'font-weight': '500'});
            $('#single-quote .content').css({'box-shadow': '5px 0 0 #111111, -5px 0 0 #111111'});








            addVideoControllers();
            buildTimeLinePoints();
            structGIFS();
            //structVids();
            startTimeLineAnim();
            loadVideoAfterSplash();



            readDeviceOrientation();
            setTimeLineColors();
            sizeFAQ();
            send3rdPartyAnalytics("View step", 1);




        if(inVideoRecording)
        {
            // info['info']['enable_captions'] = 0;
            $('.top-right-items').css('display','none');
            $('.timeline').css('display','none');
            $('.bottom-vid-drawer').css('display','none');
            moveToPause(false);
            changeLocationOnTimeline(0, false);
        }





            if (typeof info['info']['app_logo_info']['app_logo_url'] !== 'undefined')
                if (info['info']['app_logo_info']['app_logo_url']) {
                    if (info['info']['app_logo_info']['app_logo_url'].length > 0) {

                        $('.appLogo img').css('cursor', 'pointer');
                        $('.logo-follow img').css('cursor', 'pointer');
                    }
                }







        if(info['info']['plan_id'] == 2)
        {
            $('.appLogo img').css('cursor', 'pointer');
        }








    }






    var QueryString = function () {
        // This function is anonymous, is executed immediately and
        // the return value is assigned to QueryString!
        var query_string = {};
        var query = window.location.search.substring(1);
        var vars = query.split("&");
        for (var i=0;i<vars.length;i++) {
            var pair = vars[i].split("=");
            // If first entry with this name
            if (typeof query_string[pair[0]] === "undefined") {
                query_string[pair[0]] = decodeURIComponent(pair[1]);
                // If second entry with this name
            } else if (typeof query_string[pair[0]] === "string") {
                var arr = [ query_string[pair[0]],decodeURIComponent(pair[1]) ];
                query_string[pair[0]] = arr;
                // If third or later entry with this name
            } else {
                query_string[pair[0]].push(decodeURIComponent(pair[1]));
            }
        }
        return query_string;
    }();


    function audioStopped() {

        setTimeout(function(){
           if(currAudio.ended && !pauseMode )
           {
               var currScreen =  _fleeqPlayer.currentScreen;
               // console.log(currScreen);
               var numOfScreens =  _fleeqPlayer.numberOfScreens;
               // console.log(numOfScreens);



               if(currScreen == numOfScreens)
               {
                   mobileNext(false);
               }
               else
               {
                   $('.playThis-dir').fadeOut('fast', function(){

                           $(this).css('opacity', 0);
                           $(this).css('display', 'inline-block');
                           $('.next-dir').addClass('bRight');

                   });
               }
           }
       }, 1000);



    }



    $(document).on('change', '.topBarContent .localization-div .localization-div-select', function(){
        var codeKeyForLocalization = $(this).find('li.checkedLanguage').data('value');
        if(codeKeyForLocalization != curr_code_key)
            window.location = info['meta']['full_prefix']+'l/'+codeKeyForLocalization+'?autoPlay=t';
    })



    var invideo = false;

    function removeSplash() {



        $('.wrapperForStartPlay').remove();
        startFlowAfterSplash();
            // if($('.playThis-dir').css('opacity') == 0)
            // {
            //     $('.playThis-dir').css('opacity', 1);
            // }




    }

    function loadVideoAfterSplash()
    {


        if($('.wrapperForStartPlay').length > 0)
                $('.wrapperForStartPlay').fadeOut('fast');

        var startAt = 0;
        if(startAtTime)
        {
            startAt = parseFloat(startAtTime*1000/time)*100;

        }
        //if(!nojsframeAutoPlay)
        //{
        //    track('i-guide', 1, false);
        //}
        // if(!((startAt == 0) && realMobile))
         changeLocationOnTimeline(startAt, false);
        //DisplayCurrentItem();
        if(!realMobile)
        {
            // add3rdPartyChat();
        }



        if(!howlr)
        {
             fullNarrationFile.setVolume(100);
            if(realMobile)
            {
                    // $('.wrapperForStartPlay').fadeOut('fast', function(){
                    //
                    //         $(modalLoader).fadeIn('fast');
                    // })
            }
            else
            {
                fullNarrationFile.play();

            }
        }
        // else
        // {
        //
        //
        //     if(startAtTime)
        //     {
        //         fullNarrationFile.pause();
        //         setTimeout(function(){
        //             // jumpToSpecificTimeOnTimeline(startAtTime)
        //             fullNarrationFile.play();
        //             fullNarrationFile.seek(startAtTime);
        //             startFlowAfterSplash();
        //
        //         }, 500);
        //     }
        //     else
        //     {
        //         fullNarrationFile.play();
        //         fullNarrationFile.volume(1.0);
        //     }
        // }







    }



    var countCD;
    var counterCD;

    function timerCountdown()
    {

        if (countCD < 0)
        {
            clearInterval(counterCD);
            //counter ended, do something here
            return;
        }
        countCD = countCD-1;


        var elm = document.querySelector('#splashTimer > span');

        if(elm)
            elm.innerHTML = countCD;
        //Do code for showing the number of seconds here
    }

    function runAutoPlay()
    {

        invideo = false;
        timerCounteInSplash.animate(1.0);
        var timerCounter = setTimeout(function(){
            if(splashOn)
            {
                removeSplash();
            }
        }, splashAutoPlatTimer);



        anime({
            targets: '.preInfo .startPlay',
            left: '330px',
            duration: 300,
            delay: 1000,
            scale: .75 ,
            easing: 'linear',
            complete: function()
            {


                anime({
                    targets: '#splashTimer',
                    opacity: 1,
                    duration: 800,
                    easing: 'linear',
                    complete: function()
                    {
                        if(document.querySelector('#splashTimer'))
                        {
                            document.querySelector('#splashTimer').style.opacity = 1;
                        }
                    }
                })
            }


        });



        setTimeout(function(){
            countCD = parseInt(splashAutoPlatTimer/1000 -  1);
            counterCD = setInterval(timerCountdown, 1000); //1000 will  run it every 1 second
            allTimeOuts.push(counterCD);
        }, 1000);


        allTimeOuts.push(timerCounter);
    }




    function runExpPostCourse()
    {
        CTA_type = 'exp';
        CTA_exp = course_CTA_exp;
        CTA_course_index = 0;

        $('#full-opacity').hide();
        $('#info-course-div').fadeOut('fast', function(){
            if($("#single-quote"))
            {
                $("#single-quote").hide('');
            }
            runAction();
        });
    }



    $(document).on('click', '#ctaPostCourse', function (ev) {


        if( (course_CTA_type == 'exp') || (course_CTA_type == 'course') )
        {


            $('#mainPostCourse').fadeOut('fast', function() {
                runNextGuide(course_CTA_exp);
                if($('#main-content').css('display') != 'table')
                {
                    $('#main-content').css('display', 'table');
                }
                $('#main-content').css('opacity', '1.0');
                $('#mainPostCourse').remove();


                // course intro
                $('#full-opacity').remove();
                $('#info-course-div').remove();
            })



        }

    })







    function runNextGuideInCourse(nextExp, index)
    {




        CTA_type = 'exp';
        CTA_exp = nextExp;
        CTA_course_index = index


        $('#full-opacity').hide();
        $('#info-course-div').fadeOut('fast', function(){
            if($("#single-quote"))
            {
                $("#single-quote").hide('');
            }
            runAction();
        });

    }



    function showCourseData() {
        moveToPause(true);


        $('.see-indicator').each(function(){
            $(this).html('');
        })

        $('#full-opacity').fadeIn('fast', function()
        {
            $('#info-course-div').css('opacity','1.0');
            $('#info-course-div').hide().fadeIn('fast');

            if(isInIframe )
            {
                $('.openCredits').css('display','none');
                $('.midCourse').css('display','block');
                $('#info-course-div').center();
            }
            else if(!isInIframe && isMobileDevice)
            {
                $('.openCredits').css('display','none');
                $('.midCourse').css('display','block');
            }
            else
            {
                  $('.goButton > span').html('Back to guide');

                var currLiIndex = info['in_course_index'];

                var side= 'guideContent'
                if(currLiIndex > 4 )
                {
                    var side= 'guideContent2'
                    currLiIndex = currLiIndex - 5;
                }
                $('.'+side+' li').eq(currLiIndex).find('.see-indicator').html('<img src="/assets/images/incouseeye.png">')
            }

        }
        );

    }



    function setBottomCourseIndication()
    {


        var exCssPositionClass = 'conf-link-wide';
        if(info['product']['player_type'] == 1)
        {
            exCssPositionClass = 'conf-link-middle-long';
        }

        if(info['product']['player_type'] == 3)
        {
            exCssPositionClass = 'conf-link-middle';
        }


        var content = '<h4>Click for course information </h4>';


        if(isInIframe)
        {
            exCssPositionClass = exCssPositionClass + ' isFrame';
        }
        else if (isMobileDevice)
        {
            exCssPositionClass = exCssPositionClass + ' isMobile';
            content = '<h5>Course info</h5>';
        }

        // var link = '<div id="courses_link" onclick="showCourseData()" class="'+exCssPositionClass+'"> '+content+'</div>';
        // var link = '<div id="courses_link"  class="  toggleOverlay  '+exCssPositionClass+'"> '+content+'</div>';



        // if(isInIframe)
        // {
        //     $('#single-quote').append(link);
        //     $('#courses_link').css('top', (parseInt(frameHeight) - 100) + 'px');
        // }
        // else if (isMobileDevice)
        // {
        //     $('#single-quote').append(link);
        // }
        // else
        // {
        //     $('#main-content').append(link);
        //     $('#courses_link').css('margin-top', '700');
        // }
        //
        // $('#courses_link').hide();
    }


    $(document).on('click', '.nextCourse', function (ev) {


        if(isInIframe)
        {
            if($('.bottom-vid-drawer').length > 0)
            {
                $('.bottom-vid-drawer').remove();

            }
        }



        runNextGuideInCourse($(this).data('ec-key'), $(this).data('index'));
    })



    function setNumberingPosition()
    {
        $('.guideContent li').each(function(){
            var h = $(this).height();
            var paddValue = parseFloat(h/2) - 6
            if(paddValue > 0 )
            {
                $(this).find('.numbering-li').css('padding-top',paddValue+'px');
            }
        })

        $('.guideContent2 li').each(function(){
            var h = $(this).height();
            var paddValue = parseFloat(h/2) - 6
            if(paddValue > 0 )
            {
                $(this).find('.numbering-li').css('padding-top',paddValue+'px');
            }
        })
    }






    function continueCourse()
    {
        moveToPlay(false);
        $('#full-opacity').fadeOut('fast');
        $('#info-course-div').fadeOut('fast');


        if(isInIframe)
        {
            $('.timeline').fadeIn('slow');
        }
    }



    $(document).on('click', '#info-course-div  .goButton  span.continue-s.on', function (ev) {
        continueCourse();
    })

    $(document).on('click', '#info-course-div  .goButton  span.start-s.on', function (ev) {
        var retVal =  info['meta']['full_prefix']+'l/'+info['course_data'][0]['code_key']+'?mobile=t&skip=t';
        const additionalParams = _getURLAdditionalParams();
        if(additionalParams.length > 0) {
            retVal += '&'+additionalParams;
        }
        window.location = retVal;
    })



    function followLinkOnOverlay(index, shouldSkip)
    {

        // if( (info['in_course_index'] == index) && ( shouldSkip == '') )
        if(($('#info-course-div  .goButton  span.continue-s.on').length > 0) && (info['in_course_index'] == index))
        {
            continueCourse();
        }
        else
        {
            var retVal =  info['meta']['full_prefix']+'l/'+info['course_data'][index]['code_key']+'?mobile=t'+shouldSkip;
            const additionalParams = _getURLAdditionalParams();
            if(additionalParams.length > 0) {
                retVal += '&'+additionalParams;
            }


            var attr = $('#info-course-div').attr('incoursekb');

            if (typeof attr !== typeof undefined && attr !== false) {
                retVal = retVal+'&incoursekb='+attr;
            }


             window.location = retVal;
        }

    }


    function loadCourseData()
    {
        if(info['in_course'])
        {

            // if(typeof skipCourseScreen != 'undefined')
            // {
            //     if(skipCourseScreen)
            //     {
            //         var link =  info['meta']['full_prefix']+'l/'+info['course_data'][0]['code_key']+'?inCourse='+inCourse+'&mobile=t';
            //         console.log(link);
            //         return 0;
            //         // window.location =
            //     }
            //
            // }


            var maxFirst = 5;
            if(info['course_data'].length <= 5 )
            {
                maxFirst = info['course_data'].length;
            }





            var buildCourseList = '';




            if((window.name == 'inlineSoloBig') || (window.name == 'inlineSolo'))
            {

                buildCourseList = buildCourseList+'<div class="guideContent">';
                var buildCourseList1 = '<ul>';




                for (var i = 0; i < maxFirst; i++) {

                    var skip = '';
                    if(i == 0)
                    {
                            skip = '&skip=t';
                    }

                    buildCourseList1 = buildCourseList1 + '' +
                        '<li><span class="numbering-li">' + parseInt(i + 1) + '.</span><span class="content">' +
                        // '<a class="nextCourse" data-ec-key="' + curr_code_key+'?inCourse='+inCourse+'"   data-index="' + i + '" >' +
                        // '<a href="'+info['meta']['full_prefix']+'l/'+info['course_data'][i]['code_key']+'?inCourse='+inCourse+'&mobile=t'+skip+'" >' +
                        '<span class="follow-in-course" onclick="followLinkOnOverlay('+i+', \''+skip+'\' )">'+
                         info['course_data'][i]['display_name']+'<span class="eye-indication"></span>'+
                        ' </span>' +
                        '</span><span class="see-indicator"></span></li> ';
                }

                buildCourseList1 = buildCourseList1+'</ul>';
                buildCourseList = buildCourseList+buildCourseList1;


                if(info['course_data'].length > 5 ) {

                    var buildCourseList2 = '<ul>';
                    for (var i = 5; i < info['course_data'].length; i++) {
                        buildCourseList2 = buildCourseList2 + '' +
                            '<li><span class="numbering-li">' + parseInt(i + 1) + '.</span><span class="content">' +
                            // '<a class="nextCourse" data-ec-key="'+curr_code_key+'?inCourse='+inCourse+'"   data-index="'+i+'" >' +
                            // '<a href="'+info['meta']['full_prefix']+'l/'+info['course_data'][i]['code_key']+'?inCourse='+inCourse+'&mobile=t'+skip+'" >' +
                            '<span class="follow-in-course" onclick="followLinkOnOverlay('+i+', \''+skip+'\' )">'+
                            info['course_data'][i]['display_name']+'<span class="eye-indication"></span>'+
                            ' </span>' +
                            '</span><span class="see-indicator"></span></li> ';
                    }

                    buildCourseList2 = buildCourseList2 + '</ul>';
                    buildCourseList = buildCourseList+buildCourseList2;
                }

                buildCourseList = buildCourseList+'</div>';
            }
            else
            {


                if(isMobileDevice && !isInIframe)
                {

                    buildCourseList = buildCourseList+'<div class="guideContent mobile">';
                    var skip = '';

                    for ( var i = 0 ; i <  info['course_data'].length ; i ++)
                    {

                        if(i == 0)
                        {
                            skip = '&skip=t';
                        }

                        buildCourseList = buildCourseList+'' +
                            '<li><span class="numbering-li">'+parseInt(i+1)+'.</span><span class="content">' +
                            // '<a class="nextCourse" data-ec-key="'+curr_code_key+'"   data-index="'+i+'" >' +
                            // '<a href="'+info['meta']['full_prefix']+'l/'+info['course_data'][i]['code_key']+'?inCourse='+inCourse+'&mobile=t'+skip+'" >' +
                            '<span class="follow-in-course" onclick="followLinkOnOverlay('+i+', \''+skip+'\' )">'+
                            info['course_data'][i]['display_name']+'<span class="eye-indication"></span>'+
                            ' </span>' +
                            '</span><span class="see-indicator"></span></li> ';
                    }

                    buildCourseList = buildCourseList+'</ul></div>';

                }
            }



            // if(isMobileDevice)
            if(true)
            {


                var iframeClass = ""
                if(isInIframe)
                {
                    iframeClass = "inIframe"
                }




                var kb_info = '';
                if(typeof kb_id !== 'undefined')
                {
                    if(kb_id)
                    {
                        kb_info ='incoursekb="'+kb_id+'" ';
                    }
                }





                var courseInfo = '<div id="info-course-div" class="isMobile '+iframeClass+'"   '+kb_info+'>' +
                                    '<div class="openCredits">' +
                                        // '<div class="close-right-x">x</div>' +
                                        '<div class="main-title">'+info['course_meta']['display_name']+'</div>' +


                                        '<div class="info-row">' +
                                            '<div class="durationIndication">' +
                                            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8.23 9.48"><title>timeh</title><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><g id="Timer"><path d="M3.72,5.34h.8V2.67h-.8Zm3.72,0A3.32,3.32,0,1,0,4.11,8.68,3.33,3.33,0,0,0,7.43,5.34Zm.8,0A4.11,4.11,0,1,1,3.72,1.22V0h.8V1.22A4.14,4.14,0,0,1,8.23,5.34ZM7.4,2A4.64,4.64,0,0,0,5.92,1L6.23.3A5.43,5.43,0,0,1,8,1.47Z" style="fill:#9a9baf"/></g></g></g></svg>' +
                                                    '<span>' +
                                                        msToTime(info['course_meta']['duration'])+' '+info['course_meta']['duration_suffix'] +
                                                    '</span>' +
                                            '</div>' +
                                            '<div class="stepsIndication">' +
                                                // '<img src="/assets/images/acadamy/stepsw.png">' +
                                                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10.77 9.3"><title>Step indication</title><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><rect x="0.38" y="1.77" width="7.7" height="7.16" rx="0.85" ry="0.85" style="fill:none;stroke:#9a9baf;stroke-miterlimit:10;stroke-width:0.75px"/><path d="M2.69,1.69V1.23A.85.85,0,0,1,3.54.38h6a.85.85,0,0,1,.85.85V6.68a.85.85,0,0,1-.85.85H8.13" style="fill:none;stroke:#9a9baf;stroke-miterlimit:10;stroke-width:0.75px"/><path d="M5.66,5,3.52,3.75a.41.41,0,0,0-.61.35V6.58a.41.41,0,0,0,.61.35L5.66,5.7A.41.41,0,0,0,5.66,5Z" style="fill:#9a9baf"/></g></g></svg>' +
                                                    '<span>' +
                                                         info['course_meta']['numOfGuides']+
                                                    '</span>' +
                                            '</div>' +
                                            '<div class="goButton">' +
                                                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6.72 7.63"><title>Play</title><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><path d="M6.51,3.46.61.06A.41.41,0,0,0,0,.41V7.22a.41.41,0,0,0,.61.35l5.9-3.41A.41.41,0,0,0,6.51,3.46Z" style="fill:#9a9baf"/></g></g></svg>'+
                                                '<span class="start-s on" >Start series</span>' +
                                                '<span class="continue-s" >Continue series</span>' +
                                            '</div>' +
                                        '</div>' +
                                    '</div>' +
                                        buildCourseList+

                                '</div>';

                $('#ec_exp').append('<div id="full-opacity"><div>')
                $('#full-opacity').append(courseInfo).hide().fadeIn('fast');


                // $('#info-course-div').css({'width': frameWidth*1+'px'});
                // if(isInIframe)
                // {
                //     $('#info-course-div').css({'width': frameWidth*1+'px'});
                // }
                // $('#info-course-div').css({'height': frameHeight*1+'px'});
                $('#info-course-div').css({'height': '100%'});
                $('#info-course-div').css({'width': '100%'});
                var mt_w = $('.main-title').css('width');
                $('.main-title').css({'left': parseFloat((frameWidth - mt_w)/2)+'px'});
                $('.eye-indication').each(function(){
                    $(this).html('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14.52 8.89"><title>Preview</title><g id="Layer_2" data-name="Layer 2"><g id="Layer_2-2" data-name="Layer 2"><g id="eye"><circle cx="7.26" cy="4.45" r="1.52" style="fill:none;stroke:#9898b3;stroke-linecap:round;stroke-linejoin:bevel;stroke-width:0.75px"/><path d="M14,3.93h0A8.13,8.13,0,0,0,7.37.38H7.14A8.12,8.12,0,0,0,.53,3.92h0a.94.94,0,0,0,0,1L.56,5A8.13,8.13,0,0,0,6.8,8.51h.9a8.14,8.14,0,0,0,6.2-3.43L14,4.89a.94.94,0,0,0,.11-.44A.91.91,0,0,0,14,3.93Z" style="fill:none;stroke:#9898b3;stroke-linecap:round;stroke-linejoin:bevel;stroke-width:0.75px"/></g></g></g></svg>');


                })


                var d_w = $('.description').css('width');

                $('.description').css({'left': parseFloat((frameWidth - d_w)/2)+'px'});

                $('#info-course-div').center();
                setNumberingPosition();
                setGradiantOnSelector($('#info-course-div'), "#f3f3f3" , "#f3f3f3");
                // setGradiantOnSelector($('#info-course-div'), grad_A , grad_B);


            }
            else
            {
                var courseInfo = '<div id="info-course-div">' +
                    '<div class="close-right-x">x</div>' +
                    '<div class="main-title">'+info['course_meta']['display_name']+'</div>' +
                    '<div class="description">'+info['course_meta']['description']+'</div>' +
                    '<div class="durationIndication"><img src="/assets/images/acadamy/timew"><span>' +
                    msToTime(info['course_meta']['duration'])+' '+info['course_meta']['duration_suffix'] +
                    '</span></div>' +
                    '<div class="stepsIndication"><img src="/assets/images/acadamy/stepsw.png"><span>' +
                    info['course_meta']['numOfGuides']+'</span></div>' +
                    '<div class="goButton"><img src="/assets/images/acadamy/playw.png"><span>Start series</span></div>' +
                    buildCourseList+
                    buildCourseList2+
                    '</div>';

                $('#ec_exp').append('<div id="full-opacity"><div>')
                $('#full-opacity').append(courseInfo).hide().fadeIn('fast');
                if(info['course_data'].length < 6)
                {
                    $('#info-course-div').css('width', '800px');
                }
                $('#info-course-div' ).center();
                setNumberingPosition();
                setGradiantOnSelector($('#info-course-div'), grad_A , grad_B);
            }






        }
    }



    function setGradiantOnSelector(sel, grad_a , grad_b)
    {
        sel.css({'background' : '    '+'grad_a'+' ' });
        sel.css({ 'background' : '-webkit-linear-gradient(left, '+grad_a+' ,  '+grad_b+' )' });
        sel.css({ 'background' : '-o-linear-gradient(right, '+grad_a+' ,  '+grad_b+' )' });
        sel.css({ 'background' : '-moz-linear-gradient(right, '+grad_a+' ,  '+grad_b+' )' });
        sel.css({ 'background' : 'linear-gradient(to right, '+grad_a+' ,  '+grad_b+' )' });
    }


    // $(document).on('click', '.goButton', function (ev) {
    //
    //     if ($("#courses_link").length > 0) {
    //         $('.close-right-x').click();
    //     }
    //     else {
    //
    //         $('#full-opacity').fadeOut('fast');
    //         $('#info-course-div').fadeOut('fast', function () {
    //             startPlayer();
    //         });
    //     }
    //
    //
    // })

    $(document).on('click', '.close-right-x', function (ev) {




        $('#full-opacity').fadeOut('fast', function(){
            $('#info-course-div').fadeOut('fast', function(){

                if ($("#courses_link").length > 0)
                {
                    moveToPlay(true);
                }
                else
                {
                    killModal();
                }
            });
        });


    })

    //
    //isMobileDevice = isMobile;
    //isMobileDevice = true;



    function removeSplashInIfame()
    {
        $('.fullOver').fadeOut();
        $('.startPlay.iniFrame').fadeOut('fast', function(){
            moveToPlay(false);
        });

    }



    $(document).on('click', '.toggleOverlay', function (ev) {


            moveToPause(false);
            $('#info-course-div  .goButton  span.start-s').removeClass('on');
            $('#info-course-div  .goButton  span.continue-s').addClass('on');
            $('#full-opacity').fadeIn('fast');
            $('#info-course-div').fadeIn('fast');
            $('.timeline').fadeOut('fast');
            var elm  = $('.guideContent li').eq(info['in_course_index']).find('.content span.follow-in-course');
            elm.find('.eye-indication').css('display','inline-block');

    })



    function addFullFrameOvelay()
    {
        var fullOverlay = '<div class="fullOver"><span class="guide-title">'+displayName+'</span></div>';
        $('#ec_exp').append(fullOverlay);

        w = mobileScreenWidth;
        leftpos = mobileScreenWidth - 65;
        var exstyle = 'left: 340px; top:100px;' ;
        if(window.name == 'courseFrame')
        {
            exstyle = 'left: 440px; top:160px;' ;
        }


        var   headlineCode = '<div class="startPlay iniFrame" onclick="removeSplashInIfame()" style="'+exstyle+'">' +
    //        '<img src="http://exp-web-cdn.s3.amazonaws.com/playBPrefix.jpg">' +
                '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 106.59 106.59">' +
                '<defs>' +
                    '<style>' +
                        '.cls-1{opacity:0.75;fill:url(#New_Gradient_Swatch_2);}' +
                        '.cls-2{fill:#fff;}' +
                    '</style>' +
                '<linearGradient id="New_Gradient_Swatch_2" y1="53.29" x2="106.59" y2="53.29" gradientUnits="userSpaceOnUse">' +
                    '<stop offset="0" stop-color="'+grad_A+'"/>' +
                    '<stop offset="1" stop-color="'+grad_B+'"/>' +
                '</linearGradient>' +
                '</defs>' +
                    '<title>Play</title>' +
                        '<g id="Layer_2" data-name="Layer 2">' +
                            '<g id="Layer_1-2" data-name="Layer 1">' +
                                    '<circle class="cls-1" cx="53.29" cy="53.29" r="53.29"/>' +
                                    '<path class="cls-2" d="M78.22,50.33,42.89,29.94a3.42,3.42,0,0,0-5.13,3v40.8a3.42,3.42,0,0,0,5.13,3l35.33-20.4A3.42,3.42,0,0,0,78.22,50.33Z"/>' +
                            '</g>' +
                        '</g>' +
                    '</svg>' +
                '</div>';

        $('#ec_exp').append(headlineCode).hide().fadeIn('slow');


        if(window.name == 'inlineSoloMini') {
            $('.startPlay.iniFrame').addClass('inlineSoloMini');
        }
        if(window.name == 'inlineSolo') {
            $('.startPlay.iniFrame').addClass('inlineSolo');
        }

        if((window.name == 'inlineSoloBig')|| (window.name == 'inlineSoloBigNoCTA')) {
            $('.startPlay.iniFrame').addClass('inlineSoloBig');
        }


        if((window.name == 'inlineSoloMini') || (window.name == 'inlineSolo') || (window.name == 'inlineSoloBig') || (window.name == 'inlineSoloBigNoCTA')) {
            $('.guide-title').css('color', grad_A);
        }

    }



    $(document).on('click', '.left-top-logo-container.attr', function (ev) {

        window.open('https://www.fleeq.io');

    })



    function addLogoOnTopLeft() {




        var text_C = 'rgba(0,0,0,0.75)';
        if(bg_C == 'rgba(0,0,0,0.75)')
        {
            text_C = 'rgba(255,255,255,0.9)';
        }


        var titleWidth = '80px';


        if(info['in_course'])
        {
            var logoTopLeft = " " +
                "<end class='left-top-logo-container series'><div class='left-top-logo wide'>" +
                "<a href='#' class='toggleOverlay' >"+
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9.92 8.67"><title>menuseries</title><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><g id="menu"><g id="Layer_3" data-name="Layer 3"><path d="M.38,0H9.54a.44.44,0,0,1,.38.48A.44.44,0,0,1,9.54,1H.38A.44.44,0,0,1,0,.48.45.45,0,0,1,.38,0Z" style="fill:'+text_C+'"/><path d="M9.55,4.82H.38A.44.44,0,0,1,0,4.34a.44.44,0,0,1,.38-.48H9.54a.44.44,0,0,1,.38.48A.44.44,0,0,1,9.55,4.82Z" style="fill:'+text_C+'"/><path d="M9.55,8.67H.38A.44.44,0,0,1,0,8.19a.44.44,0,0,1,.38-.48H9.54a.44.44,0,0,1,.38.48A.44.44,0,0,1,9.55,8.67Z" style="fill:'+text_C+'"/></g></g></g></g></svg>'+
                // "<a href='"+info["meta"]["full_prefix"]+"l/"+info['course_data'][0]['code_key']+"?inCourse="+inCourse+"&mobile=t' >"+

                "<span>"+displayName+"</span>"+
                "</div></div>";

            $('#modal-content').append(logoTopLeft);

            var titleWidth = ($('.left-top-logo-container span').innerWidth() + 1) + "px";


        }

        else
        {

            var hideLogo = 'hide'; // removed the top left logo
            if(info['f_attr'] == 0)
            {
                hideLogo = 'hide';
            }
            var logoTopLeft = " " +
                "<div class='left-top-logo-container attr "+hideLogo+" '><div class='left-top-logo wide'>" +
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18.03 20.63" ><g><path d="M16.65,7.93,3.57.37C1.73-.69,0,.64,0,2.76V7.67a.4.4,0,0,0,.4.4H2.76a.39.39,0,0,0,.39-.39V5.18a1.17,1.17,0,0,1,1.76-1l8.25,4.76a1.6,1.6,0,0,1,0,2.78L4.91,16.47a1.17,1.17,0,0,1-1.76-1V13.19a.39.39,0,0,0-.39-.39H.4a.4.4,0,0,0-.4.4v4.67C0,20,1.73,21.32,3.57,20.26l13.08-7.55A2.76,2.76,0,0,0,16.65,7.93Z" style="fill:'+text_C+'"></path></g></svg>'+
                "<a target=''><span> Fleeq.io </span>"+
                "</div></div>";




            if(typeof removeAttribution !== 'undefined')
            {
                if(removeAttribution)
                {
                    logoTopLeft = '';
                }
            }


            $('#modal-content').append(logoTopLeft);
        }


        $('.left-top-logo').css('background-color', bg_C);
        $('.left-top-logo a span').css('color', text_C);




        $('<style>@-webkit-keyframes minWidth{ from { width:'+titleWidth+'} to { width:28px}</style>').appendTo('head');
        $('<style>@keyframes minWidth{ from { width:'+titleWidth+'} to { width:28px}</style>').appendTo('head');

        $('<style>@-webkit-keyframes maxWidth{ from { width:28px} to { width:'+titleWidth+'}</style>').appendTo('head');
        $('<style>@keyframes maxWidth{ from { width:28px} to { width:'+titleWidth+'}</style>').appendTo('head');





    }



    function logoToMin()
    {
        $('.left-top-logo').removeClass('wide');
        $('.left-top-logo').addClass('short');
        $('.left-top-logo').addClass('minLogoWidth')
        $('.left-top-logo').bind('oanimationend animationend webkitAnimationEnd', function() {
            $('.left-top-logo').css('width', '28px');
            $('.left-top-logo').removeClass('minLogoWidth');

        });
    }


    function logoToMax()
    {
        $('.left-top-logo').removeClass('short');
        $('.left-top-logo').addClass('wide');
        $('.left-top-logo').addClass('maxLogoWidth')
        $('.left-top-logo').bind('oanimationend animationend webkitAnimationEnd',  function() {
               $('.left-top-logo').css('width', 'auto');
               $('.left-top-logo').removeClass('maxLogoWidth');

        });
    }


    $(document).on({
        mouseenter: function () {
            clearTimeout(timerForLogoMin)
            logoToMax();
        },

        mouseleave: function () {
            logoToMin();
        }
    }, '.left-top-logo');


    var timerForLogoMin = false;


    function animateLeftTopLogo() {


        timerForLogoMin = setTimeout(function(){
            logoToMin();
        }, 4000);


    }


    $(document).on("click", ".clickToPlayInIframe", function() {
        removeSplash();
    })

    function heyTest()
    {
        alert('adsfa');
    }

    function setCaptionsAndRTL()
    {
        $('.modal.ec').removeClass('rtl');

        if( info['info']['is_rtl']  == 1 )
        {
            rtl = true;

            $('.modal.ec').addClass('rtl');
        }

        if( info['info']['enable_captions']  == 1 )
        {
            captions = true;
        }
    }



    var tab_visibility = function(){

        var hidden, state, visibilityChange;

        if (typeof document.hidden !== "undefined") {
            state = "visibilityState";
        } else if (typeof document.mozHidden !== "undefined") {
            state = "mozVisibilityState";
        } else if (typeof document.msHidden !== "undefined") {
            state = "msVisibilityState";
        } else if (typeof document.webkitHidden !== "undefined") {
            state = "webkitVisibilityState";
        }

        return document[state];
    }



    function addPlayToInitialFleeq()

    {
        var onclickFunction = 'removeSplash()'
        if(true)
            onclickFunction = 'removeSplashAfterClick()';


        headlineCode = '<div class="    wrapperForStartPlay"><div class="startPlay " onclick="'+onclickFunction+'" style="">' +
            //        '<img src="http://exp-web-cdn.s3.amazonaws.com/playBPrefix.jpg">' +
            '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 173.38 173.38">' +
            '<defs>' +
            '<style>' +
            '.cls-1{fill:url(#New_Gradient_Swatch_1_copy);}' +
            '.cls-2{fill:#fff;}' +
            '</style>' +
            '<linearGradient id="New_Gradient_Swatch_1_copy" y1="86.69" x2="173.38" y2="86.69" gradientUnits="userSpaceOnUse">' +
            '<stop offset="0" stop-color="'+grad_A+'"/>' +
            '<stop offset="1" stop-color="'+grad_B+'"/>' +
            '</linearGradient>' +
            '</defs>' +
            '<title>Play</title>' +
            '<g id="Layer_2" data-name="Layer 2">' +
            '<g id="Layer_1-2" data-name="Layer 1">' +
            '<rect class="cls-1" width="173.38" height="173.38" rx="86.69" ry="86.69"/>' +
            '<path class="cls-2" d="M132.21,84.59,59,42.35a3.5,3.5,0,0,0-5.25,3v84.48a3.5,3.5,0,0,0,5.25,3l73.16-42.24A3.5,3.5,0,0,0,132.21,84.59Z"/>' +
            '</g>' +
            '</g>' +
            '</svg>' +
            '</div></div>';






        $('.modal.ec').prepend(headlineCode);

        sizeFAQ();
    }


    var trackStarted = false;
    function startPlayer() {


        $('#ec_exp').append('<div id="isLoaded"></div>');
        viewAction();
        transitionDelay = parseInt(_fleeqPlayer.transitionTiming);


        send3rdPartyAnalytics("Started", false);
        if(nojsframeAutoPlay && (tab_visibility() == 'visible'))
        {
            removeSplash();
            var valueForScreenTracking = 1;
            if(startAtTime)
            {
                var tempPrecentage = parseFloat(startAtTime*1000/time)*100;
                valueForScreenTracking = binarySearchForScreen(tempPrecentage)

            }

            if(shouldTrack)
            {
                track('start-at', valueForScreenTracking, false);
                trackStarted = true;
            }

        }
            else
            {
                if(shouldTrack)
                {
                    track('start', false, false);
                    trackStarted = true;
                }

                if(!realMobile)
                    addPlayToInitialFleeq();
                else
                    removeSplash();


            }


        $('.preInfo').addClass('noJS');
        $('.modal.ec #main-content').addClass('noJS');
        $('.modal.ec').addClass('noJS');
        $('#modal-content').addClass('noJS');
        // $('.modal.ec #main-content.noJS').css('background-color', info['info']['player_bg_color']);
        // $('.modal.ec').css('background-color', info['info']['player_bg_color']);



        document.onkeydown =  saved_keydown;




                    var hideLogo = '';
                    if(info['f_attr'] == 0)
                    {
                        hideLogo = 'hide';
                    }

             var logoAttribution = '';



             if(typeof removeAttribution !== 'undefined')
             {
                 if(removeAttribution)
                 {
                     logoAttribution = '';
                 }
             }




             if($('.attribution-wrapper').length == 0)
             {



                 var personalInfo = false;

                 if(!attributionObj)
                 {
                     // just logo, No attribution

                     personalInfo = '<div style="text-align: center;" class="attribution-wrapper">' +
                         logoAttribution +
                         '</div>';


                 }
                 else
                 {

                     var titleCreator = "";
                     if(attributionObj['userTitle'].length  > 0 )
                     {
                         titleCreator = ", "+attributionObj['userTitle'];
                     }

                     var personImage = '';
                     if(attributionObj['userImage'])
                     {
                         const personImgURL = attributionObj["userImage"];
                         personImage = '<div class="person-image" style="background-image: url('+personImgURL+');"></div> ';

                     }

                     var a_prefix = '';
                     var a_suffix = '';
                     if(attributionObj['actionURL'])
                     {
                         if((attributionObj['actionURL'] != 'http://') && (attributionObj['actionURL'] != 'https://')) {
                             var target = '';
                             if (attributionObj['actionNewTab']) {
                                 target = ' target= "_blank"';
                             }


                             a_prefix = '<a href = "' + attributionObj['actionURL'] + '"  ' + target + '  class="attribution-personal-link">';
                             a_suffix = '</a>';
                         }
                     }




                     personalInfo = '<div style="text-align: center;" class="attribution-wrapper">' +
                         a_prefix +
                         '<div class="landing-personal-message" style="display: block;">' +
                         personImage+
                         '<div class="person-name">'+attributionObj['userName']+'</div>' +
                         '<div class="person-message ">'+attributionObj['message']+'</div>' +
                         '</div>' +
                         a_suffix +
                         logoAttribution +
                         '</div>';

                     if(info['header_rtl'] == 1)
                     {

                         personalInfo = '<div style="text-align: center;" class="attribution-wrapper">' +
                             a_prefix +
                             '<div class="landing-personal-message rtl" style="display: block;">' +

                             '<div class="person-message rtl">'+attributionObj['message']+'</div>' +
                             '<div class="person-name">'+attributionObj['userName']+'</div>' +
                             personImage+
                             '</div>' +
                             a_suffix +
                             logoAttribution +
                             '</div>';


                     }
                 }





                 $('.nameAndAttribution').append(personalInfo);

             }






        manageCaptions(0);



    }




    function applyLoaderColors()
    {


        $('.fleeq-loader-path-second-c').css('stroke',grad_A);
        var cssAnimation = document.createElement('style');
        cssAnimation.type = 'text/css';
        var rules = document.createTextNode(
                '.fleeq-loader-path-second-c'+
        '{'+
            'stroke: '+grad_A+';'+
            'animation: dash-second 3s ease-in-out infinite;'+
        '}'

        );
        cssAnimation.appendChild(rules);
        document.getElementsByTagName("head")[0].appendChild(cssAnimation);
    }



    function applyMobileLoaderColors()
    {
        var cssAnimation = document.createElement('style');
        cssAnimation.type = 'text/css';
        var rules = document.createTextNode(
            '@keyframes audioWave { '+
        '25% {'+
            'background: linear-gradient( '+grad_B+' ,  '+grad_B+' ) 0 50%, linear-gradient( '+grad_A+' ,  '+grad_A+' ) 0.625em 50%, linear-gradient( '+grad_A+' ,  '+grad_A+' ) 1.25em 50%, linear-gradient( '+grad_A+' ,  '+grad_A+' ) 1.875em 50%, linear-gradient( '+grad_A+' ,  '+grad_A+' ) 2.5em 50%;'+
        'background-repeat: no-repeat;'+
        'background-size: 0.5em 2em, 0.5em 0.25em, 0.5em 0.25em, 0.5em 0.25em, 0.5em 0.25em;'+
            '}'+
        '37.5% {'+
            'background: linear-gradient( '+grad_A+' ,  '+grad_A+' ) 0 50%, linear-gradient( '+grad_B+' ,  '+grad_B+' ) 0.625em 50%, linear-gradient( '+grad_A+' ,  '+grad_A+' ) 1.25em 50%, linear-gradient( '+grad_A+' ,  '+grad_A+' ) 1.875em 50%, linear-gradient( '+grad_A+' ,  '+grad_A+' ) 2.5em 50%;'+
        'background-repeat: no-repeat;'+
        'background-size: 0.5em 0.25em, 0.5em 2em, 0.5em 0.25em, 0.5em 0.25em, 0.5em 0.25em;'+
    '}'+
        '50% {'+
            'background: linear-gradient( '+grad_A+' ,  '+grad_A+' ) 0 50%, linear-gradient( '+grad_A+' ,  '+grad_A+' ) 0.625em 50%, linear-gradient( '+grad_B+' ,  '+grad_B+' ) 1.25em 50%, linear-gradient( '+grad_A+' ,  '+grad_A+' ) 1.875em 50%, linear-gradient( '+grad_A+' ,  '+grad_A+' ) 2.5em 50%;'+
        'background-repeat: no-repeat;'+
        'background-size: 0.5em 0.25em, 0.5em 0.25em, 0.5em 2em, 0.5em 0.25em, 0.5em 0.25em;'+
    '}'+
        '62.5% {'+
            'background: linear-gradient( '+grad_A+' ,  '+grad_A+' ) 0 50%, linear-gradient( '+grad_A+' ,  '+grad_A+' ) 0.625em 50%, linear-gradient( '+grad_A+' ,  '+grad_A+' ) 1.25em 50%, linear-gradient( '+grad_B+' ,  '+grad_B+' ) 1.875em 50%, linear-gradient( '+grad_A+' ,  '+grad_A+' ) 2.5em 50%;'+
        'background-repeat: no-repeat;'+
        'background-size: 0.5em 0.25em, 0.5em 0.25em, 0.5em 0.25em, 0.5em 2em, 0.5em 0.25em;'+
    '}'+
        '75% {'+
            'background: linear-gradient( '+grad_A+' ,  '+grad_A+' ) 0 50%, linear-gradient( '+grad_A+' ,  '+grad_A+' ) 0.625em 50%, linear-gradient( '+grad_A+' ,  '+grad_A+' ) 1.25em 50%, linear-gradient( '+grad_A+' ,  '+grad_A+' ) 1.875em 50%, linear-gradient( '+grad_B+' ,  '+grad_B+' ) 2.5em 50%;'+
        'background-repeat: no-repeat;'+
        'background-size: 0.5em 0.25em, 0.5em 0.25em, 0.5em 0.25em, 0.5em 0.25em, 0.5em 2em;'+
    '}'+
    '}'

        );
        cssAnimation.appendChild(rules);
        document.getElementsByTagName("head")[0].appendChild(cssAnimation);
    }


    var window_focus;
    $(window).focus(function() {
        window_focus = true;
    }).blur(function() {
         window_focus = false;
    });

    var didFrameLoad = false;
    var fleeq_loaded=  false;
    function wait() {



        add3rdPartyChat();
        // sizeStepBy();
        if($('.bottomToast').length > 0)
        {
            $('.bottomToast').fadeIn('fast');
        }


        volumeOff = false;
        creatingPost = false;
        $('#main-content').css('opacity','1');

        if($('.mobileMain').length == 0)
        {

            killModal();

            return;
        }

        if(realMobile)
            fullAudioFileLoaded = true;
        if ( didFrameLoad && fullAudioFileLoaded && thirdPartyAnalyticsDone ) {
            if(!structVids()){
                setTimeout(function(){
                    wait();
                }, 500);
                return;
            }
            setCaptionsAndRTL();
            fleeq_loaded = true;
            $(modalLoader).fadeOut('fast', function(){
                modalContent.style.opacity = 1;
                modalContent.style.visibility = 'visible';


                if(realMobile)
                {
                    if(($('.wrapperForStartPlay').length < 1) && !clickedPlayOnMobile)
                        addPlayToInitialFleeq();

                    if (fullFileProgress == 100 && clickedPlayOnMobile) {
                        soundManager.resume('fullAudioFile');
                        fullNarrationFile.setVolume(0);
                        nojsframeAutoPlay = false;
                        $('.preInfo').css('display', 'none');
                        startPlayer();



                    } else {
                        setTimeout(function(){
                            wait();
                        }, 500);
                    }
                }
                else
                    startPlayer();



            })

        } else {
            setTimeout( wait, 500 );
        }
    }

    function loadAndDisplay()
    {

        document.onkeydown =  saved_keydown;
          modalContent.style.display = "block";
          modalLoader.style.display = "none";


        if(accordionMode)
        {
            //accordionMode.style.display = "block";

        }

        if (currType.toLowerCase().localeCompare('step-by-step') == 0)
        {

            if(info['product']['player_type'] == 2) {
                accordionMode = true;
            }


            if(stepByStepModalOverlay == 1)
            {


                // var mainBG = document.getElementsByClassName('modal')[0];
                // mainBG.insertBefore(divNew , mainBG.childNodes[0] );
                // var overlayBG = document.getElementsByClassName('top-half-overlay')[0];
                // overlayBG.style.height = topOvelayH+"px";
            }

            // addRecommendations();
            //  if(info['product']['player_type'] == 2) {
            //     document.querySelector('.desk.accordion.arrows').style.left = '50px';
            // }






            var extraForTallAccord = 0;
            if (heightForOverAccord() > 390 )
            {
                extraForTallAccord = parseFloat(heightForOverAccord()  - 390 ) ;
            }



            // setAccordionBackLinks();






        }

    }



    function preload() {
        var extraCss = '';
        if(currType.toLowerCase().localeCompare('step-by-step') == 0) {
            if(window.name == 'y-mobile') {
                extraCss = extraCss+stepByStepModal;
            } else {
                extraCss = extraCss+stepByStepModal+' desk ';
            }
            if(!targetElm && ((info['product']['player_type'] == 2) || (info['product']['player_type'] == 4))) {
                extraCss = extraCss+'  ';
            }
        }
        if(targetElm) {
            extraCss += ' embedded ';
        }
        var dedicatedCSSposition = "margin: 15px auto; display:table; position:relative; width:auto !important; ";
        if(isMobileDevice) {
            dedicatedCSSposition = "margin: 0px auto; display:table; position:relative; width:auto !important; ";
        }
        if(isInIframe) {
            dedicatedCSSposition = "margin: 0px; display:table; position:relative; width:100%; ";
            if(window.name == 'courseFrame') {
                $('body').css('background-color', 'red');
            }
        }

        var classesAddOn = "";
        if(inVideoRecording) {
            classesAddOn = "inRecordMode";
            if(captionnOff)
                classesAddOn = classesAddOn+" capOff";
        } else {
            if(info['info']['enable_captions'] == 0) {
                classesAddOn = " capOff";
            }
        }
        var htmlFrame = '<div class="modal ec '+extraCss+' '+classesAddOn+'" id="ec_exp"><div id="main-content" style="'+dedicatedCSSposition+'"></div></div>';
        var wrapper= document.createElement('div');
        wrapper.innerHTML= htmlFrame;
        var divNew = wrapper.firstChild;
        applyLoaderColors();
        if(targetElm) {
            targetElm.insertBefore(divNew , targetElm.firstChild);
        } else {
            document.body.insertBefore(divNew , document.body.firstChild);
        }

        modal = document.getElementById('ec_exp');
        modalLoader = document.getElementsByClassName('loader-2')[0];
        modal.style.display = "block";
        var slidingTagLiAfterStyle = document.createElement("style");
        slidingTagLiAfterStyle.innerHTML = "" +
            ".alt-loader-4::after {background-color: "+grad_A+";}" +
            ".alt-loader-4 span::after {background-color: "+grad_A+";}" +
            ".alt-loader-4 span::before {background-color: "+grad_A+";}" +
            ".alt-loader-2 span::before {border-top:  6px solid "+grad_A+";}" +
            ".alt-loader-2 span::after {border:  6px solid "+grad_A+"90;}" +
            ".alt-loader-1 span::after  {border:   6px solid "+grad_A+";}";
        document.head.appendChild(slidingTagLiAfterStyle);
        var topRightSection = '<div class="top-right-items">' +
            '<div class="top-right-item share" style="opacity: 0;"></div>' +
            '<div class="top-right-item series" style="opacity: 0;"></div>' +
            '<div class="top-right-item indie" style="opacity: 0;">' +
            '<div class="displayInfoSection"><div>'+displayName+'</div>' +
        '</div></div>';
        $('#main-content').prepend(topRightSection);
        if(isGif)
            $('.top-right-item.indie').css('display','none');
        // $('.loader-2').center();
    }

    function checkConfigurationSanity()
    {
        $response = true;


        if(narration == '1')
        {
            for(var i = 0 ; i < audioFiles.length ; i++ )
            {
                if(!audioFiles[i])
                {
                    $response = false;
                    break;
                }
            }
        }





        return $response;
    }


    function add3rdPartyChat()
    {


        if(info['info']['3rd_party_chat']) {
            if (info['info']['3rd_party_chat_type']) {

                thirdPartyChatDone = false;
                thirdPartyChat = info['info']['3rd_party_chat_type'];
                if(thirdPartyChat == 'intercom')
                {
                    runIntercom(info['info']['3rd_party_chat_code']);
                    $('#intercom-container').css('display','block');
                }
                if(thirdPartyChat == 'zendesk')
                {
                    runZendesk(info['info']['3rd_party_chat_code']);
                }

                if(thirdPartyChat == 'drift')
                {
                    runDrift(info['info']['3rd_party_chat_code']);
                }

                if(thirdPartyChat == 'convertFox')
                {
                    runConvertFox(info['info']['3rd_party_chat_code']);
                }

                if(thirdPartyChat == 'crisp')
                {
                    runCrisp(info['info']['3rd_party_chat_code']);
                }

                if(thirdPartyChat == 'olark')
                {
                    runOlark(info['info']['3rd_party_chat_code']);
                }

                if(thirdPartyChat == 'liveChat')
                {
                    runLiveChat(info['info']['3rd_party_chat_code']);
                }

                if(thirdPartyChat == 'userLike')
                {
                    runUserLike(info['info']['3rd_party_chat_code']);
                }

            }
        }
    }


    function send3rdPartyAnalytics(type, data)
    {
        if(thirdPartyAnalytics)
        {
            if(thirdPartyAnalytics == 'ga')
            {
                if(type == 'Started')
                {
                    ga('send', 'event', 'Fleeq - '+type , displayName , null);
                }
                else
                {
                    var stepNumber = '1';
                    if(data)
                    {
                        stepNumber = data;
                    }
                    ga('send', 'event', 'Fleeq - '+type, displayName , stepNumber);
                }

            }

            if(thirdPartyAnalytics == 'mixPanel')
            {
                if(type == 'Started')
                {
                    mixpanel.track(
                        "Fleeq",
                        {   "action": type,
                            "Name": displayName}
                    );
                }
                else
                {
                    var stepNumber = '1';
                    if(data)
                    {
                        stepNumber = data;
                    }

                    mixpanel.track(
                        "Fleeq",
                        {   "action": type,
                            "Name": displayName ,
                            "stepNumber" : stepNumber
                        }
                    );
                }

            }
        }
    }







    function runFlow(element , shouldClean)
    {

        // check if we can un he modal or show a popup






            if(!liveModal)
            {
                liveModal = true;
                if(shouldClean)
                {
                    cleaningDOM();
                }


                draft_mode_set = $(element).hasClass("draftMode");

                currKey = element.getAttribute("ec-key");
                currType = element.getAttribute("ec-type");
                if(element.getAttribute("ec-target"))
                {
                    targetElm = document.querySelector(element.getAttribute("ec-target"));
                }

                if(element.getAttribute("ec-academy"))
                {
                    targetElm = document.querySelector(element.getAttribute("ec-target"));
                }

                curr_exp_id = false;
                getData(currKey, currType, false , false);
            }
    }
    function runFlowOffline(jsonData){
        if(!liveModal)
        {
            var element = document.getElementById('mainLink');
            liveModal = true;
            cleaningDOM();
            draft_mode_set = $(element).hasClass("draftMode");
            currKey = element.getAttribute("ec-key");
            currType = element.getAttribute("ec-type");
            if(element.getAttribute("ec-target")) {
                targetElm = document.querySelector(element.getAttribute("ec-target"));
            }
            if(element.getAttribute("ec-academy")) {
                targetElm = document.querySelector(element.getAttribute("ec-target"));
            }
            curr_exp_id = currKey;
            assignAndLoadPopup(JSON.stringify(jsonData));
            cached_fleeq_response[currKey] = JSON.stringify(jsonData);
        }
    }

    function runFlowFaqElement(data , shouldClean)
    {

        if(shouldClean)
        {
            cleaningDOM();
        }

        currKey = false;;
        currType = 'faq-element';

        curr_exp_id = data['meta']['exp-id'];
        preload();
        assignAndLoadPopup(data)

    }





    function inIframe () {
        try {
            return window.self !== window.top;
        } catch (e) {
            return true;
        }
    }

    function viewport()
    {
        var e = window
            , a = 'inner';
        if ( !( 'innerWidth' in window ) )
        {
            a = 'client';
            e = document.documentElement || document.body;
        }
        return { width : e[ a+'Width' ] , height : e[ a+'Height' ] }
    }


    var mobileScreenWidth = false;
    var mobileScreenHeight = false;

    var isInIframe  = (window.location != window.parent.location) ? true : false;

    var inVidRecording = false;
    var inVidRecordingCapOff = false;

    var embedCaptionOff = false;

    var iFrameAutoPlay = true;
    var inIframeNoJS = false;


    if(typeof nojsframe !== 'undefined')
    {
        if(nojsframe)
        {
            iFrameAutoPlay = false;
            inIframeNoJS = true;
        }
    }

    var iFrameEmbeddableWidth = false;
    var iFrameEmbeddableHeight = false;

    if(typeof window.name !== 'undefined')
    {


        isInIframe = true;
        if((window.name == 'f-n-inIframe') || (window.name == 'passcode-inIframe'))
        {
            isInIframe = false;
        }

        if(window.name == 'y-mobile' )
        {
            isInIframe = false;
            isMobileDevice = true;
        }

        if(window.name == 'inlineSoloBigCapOff' )
        {
            window.name = 'inlineSoloBig';
            embedCaptionOff = true;
        }


        if(typeof forVideo !== 'undefined')
        {
            if(forVideo)
            {
                isInIframe = true;
                window.name = 'inlineSoloBig';
                inVidRecording = true;
                if(typeof captionnOff !== 'undefined')
                {
                    inVidRecordingCapOff = true;
                }



            }

        }



        if( (window.name == '') &&  inIframe ())
        {

            iFrameEmbeddableWidth = document.body.clientWidth;
            iFrameEmbeddableHeight = document.body.clientHeight;
            isInIframe = true;
            isMobileDevice = true;
            iFrameAutoPlay = false;
        }

    }











    if(isInIframe)
    {
        window.addEventListener('message',function(event) {
            // console.log('message received:  ' + event.data,event);

            if(event.data,event.data = 'inProgress')
            {
                in_video_progress = 'running';
            }

        },false);

    }



    var frameWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    var frameHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    var requireEmail = false;
    var fullNarrationFile = false;
    var fullHighDef = false;
    var fullFileProgress = 0;
    var isGif = false;
    var _isKeysEnabled = true;



    function assignAndLoadPopup(dataInfo) {


        if(dataInfo == -1 )
        {

            return;
        }
        hasAutoPlay = false;
        shouldRewind = false;
        shouldLoop = false;
        showArrows = true;
        showCloseButton = true;


        if (currType.toLowerCase().localeCompare('faq-link') == 0)
        {
            showArrows = false;
            showCloseButton = false;

        }
        else
        {
            if( currType.toLowerCase().localeCompare('faq-element') == 0 )
            {

            }
            else
            {
                info = JSON.parse(dataInfo);
                curr_exp_id = info['meta']['exp_id'];
                currType = info['meta']['type'];



                if(!info['in_course'] && info['meta']['require_email'])
                {
                    requireEmail = true;
                }


                if(currType.toLowerCase().localeCompare('step-by-step') == 0)
                {


                    side_quote = false;
                    single_quote = false;
                    if( info['product'] !== undefined )
                    {

                        if(inVideoRecording)
                            info['product']['player_type'] = 1;

                        if((info['product']['player_type'] == 2) || (info['product']['player_type'] == 4))
                                side_quote = true;


                        if(side_quote) {
                            if ((info['product']['player_type'] == 4)) {
                                single_quote = true;
                            }
                        }
                        else {
                            if ((info['product']['player_type'] == 1)) {
                                single_quote = true;
                            }
                        }


                        if(isInIframe)
                        {
                            isMobileDevice = true;
                        }


                        if(isMobileDevice)
                        {
                            single_quote = true;


                            var w = screen.width; //window.innerWidth;
                            var h = screen.height; // window.innerHeight;


                            if(window.name == 'y-mobile')
                            {
                               w = 254;
                               h = 453;
                            }


                            mobileScreenWidth = w;
                            mobileScreenHeight = h;

                            if(w > h)
                            {
                                mobileScreenWidth = h;
                                mobileScreenHeight = w;
                            }


                            if(isInIframe)
                            {
                                w = frameWidth;
                                h = frameHeight;


                                mobileScreenWidth = h*1024/768 - 30;
                                mobileScreenHeight = h;
                            }









                        }


                        grad_A = info['product']['player_grad_a'];
                        grad_B = info['product']['player_grad_b'];


                        if(typeof info['product']['bg_controls'] !== 'undefined')
                        {
                            bg_C  = info['product']['bg_controls'];

                            bg_c_timeline = '#bcbfcc';
                            bg_c_text = '#333333';
                            if(bg_C == 'rgba(0,0,0,0.75)')
                            {
                                bg_c_timeline = '#646466';
                                bg_c_text = '#ffffff';
                            }
                        }

                        applyLoaderColors();
                       $('.loaderaudioWave').css('background', grad_A );
                        applyMobileLoaderColors();

                    }



                     if((info['info']['format'] == 1) && !inVideoRecording)
                        isGif = true;




                    if( info['info'] !== undefined ) {
                        if (info['info']['modal_type'] != null) {
                            stepByStepModal = info['info']['modal_type'];
                        }
                        if (info['info']['modal_font_color'] != null) {
                            stepByStepModalFontColor = info['info']['modal_font_color'];
                        }
                        if (info['info']['overlay'] != null) {
                            stepByStepModalOverlay = info['info']['overlay'];
                        }
                        if (info['info']['Alignment'] != null) {
                            stepByStepModalAlignment = info['info']['Alignment'];
                        }
                        if (info['info']['Text_alignment'] != null) {
                            stepByStepModalTextAlignment = info['info']['Text_alignment'];
                        }


                        if ((window.name == 'courseFrame') || (window.name == 'inlineSoloBigNoCTA')) {
                            info['info']['enable_cta'] = '0';
                        }





                        if (info['info']['enable_cta'] != null) {
                            CTA = info['info']['enable_cta'];
                        }




                        if (info['info']['cta_type'] != null) {
                            CTA_type = info['info']['cta_type'];
                        }

                        if (info['info']['cta_text'] != null) {
                            CTA_text = info['info']['cta_text'];
                        }

                        if (info['info']['link_address'] != null) {
                            CTA_action = info['info']['link_address'];
                        }

                        if (info['info']['link_same_page'] != null) {
                            CTA_link_same_page = info['info']['link_same_page'];
                        }

                        if (info['info']['cta_exp'] != null) {
                            CTA_exp = info['info']['cta_exp'];
                        }


                        if (info['info']['enable_narration'] != null) {
                            narration = info['info']['enable_narration'];

                        }
                        if (narration == '0') {
                            // allMute = true;
                        }


                        if (info['info']['narration_type'] != null) {
                            narration_type = info['info']['narration_type'];
                        }

                        if (info['names']['display_name'] != null) {
                            displayName = info['names']['display_name'];

                        }

                    }


                        if(info['info']['3rd_party_analytics']) {
                            if (info['info']['3rd_party_analytics_type']) {
                                thirdPartyAnalyticsDone = false;
                                thirdPartyAnalytics = info['info']['3rd_party_analytics_type'];
                                if(thirdPartyAnalytics == 'ga')
                                {
                                        runGA(info['info']['3rd_party_analytics_code']);
                                }
                                if(thirdPartyAnalytics == 'mixPanel')
                                {
                                         runMixPanel(info['info']['3rd_party_analytics_code']);
                                }
                            }
                        }









                        if(info['info']['step_by_step'])
                            stepByStepFlow = true;


                        if(info['info']['enable_info_bar'])
                            showBottomAttribute = true;


                        if(!howlr)
                        {
                            soundManager.setup({
                                 // url: '/assets/vendor/sm2/sm2swf',
                                onready: function() {
                                    fullNarrationFile =   soundManager.createSound({
                                        id: 'fullAudioFile',
                                        url: info['info']['full_narration_path'],
                                        autoLoad: true,
                                        forceUseGlobalHTML5Audio: true,
                                        ignoreMobileRestrictions: true,
                                        autoPlay: false,
                                        multiShot: false,
                                         onload: function() {
                                            soundManager._writeDebug(this.id + ' loaded');
                                            fullAudioFileLoaded = true;
                                            if(fullFileProgress == 0)
                                                fullFileProgress = 100;
                                        },
                                        whileloading: function() {
                                            soundManager._writeDebug(this.id + ': loading ' + this.bytesLoaded + ' / ' + this.bytesTotal);
                                            if(!pauseMode)
                                            {
                                                // console.log(pauseMode);
                                                // console.log(inBlurMode);
                                                fullFileProgress = this.bytesLoaded*100;
                                            }
                                        },
                                        whileplaying: function() {
                                            // demo only: show sound position while playing, for context
                                            // soundManager._writeDebug('position = ' + this.position);
                                            sm_timer_position = this.position;
                                        },
                                        onerror: function(code, description) {
                                            console.log(this.id + ' failed?', code, description);
                                            // Did the sound fail to load entirely, or failed during playback / loading partially?
                                            if (this.loaded) {
                                                // HTML5 case: network error, or client aborted download etc.?
                                                this.stop(); // Reset sound state, to be safe
                                                // Show play / retry button to user in UI?
                                            } else {
                                                // Load failed entirely. 404, bad sound format, etc.
                                            }
                                        },
                                        onsuspend: function() {
                                            //console.log('Suspended');
                                        },
                                        onpause: function() {
                                            //console.log('pause');
                                        },
                                        onplay: function() {
                                            //console.log('play');
                                        },
                                        volume: 100,
                                         stream: true,
                                         useHTML5Audio: true,
                                        preferFlash: true,
                                        useHighPerformance: true
                                    });
                                }
                            });
                        }
                        else
                        {
                            fullNarrationFile = new Howl({
                                src: [info['info']['full_narration_path']],
                                html5: true
                            });

                            fullNarrationFile.on('load', function(){
                                // console.log('loaded')
                                // fullNarrationFile.play();
                                fullAudioFileLoaded = true;
                            });
                        }
















                    steps = [];
                    if( info['steps'] !== undefined )
                    {
                        screenTimes = Array();
                        screenTimesOffsets = Array();

                        for (i = 0; i < info['steps'].length ; i++) {

                            steps[i]  = {};
                            steps[i]['content'] = info['steps'][i]['content'];
                            steps[i]['title'] = info['steps'][i]['title'];

                            steps[i]['id'] = info['steps'][i]['id'];
                            steps[i]['edited'] = info['steps'][i]['edited'];

                            screenTimes[i] = info['steps'][i]['duration_f'];

                            if(i == 0)
                                screenTimesOffsets[i] = 0;
                            else
                            {
                                        screenTimesOffsets[i] = screenTimesOffsets[i-1]+screenTimes[i-1]+600;
                            }

                        }

                     var goSilent = false;
                            if(typeof muteVid !== 'undefined')
                            {
                                    if(muteVid)
                                    {
                                        goSilent = true;
                                    }
                            }
                            if(goSilent)
                            {
                                fullAudioFileLoaded = true;
                            }
                            else
                            {




                            }


                    }




                    if( info['recommendations'] !== undefined )
                    {
                        for (i = 0; i < info['recommendations'].length ; i++) {

                            recommendations[i]  = {};
                            recommendations[i]['web_exp_id'] = info['recommendations'][i]['web_exp_id'];
                            recommendations[i]['exp_id'] = info['recommendations'][i]['exp_id'];
                            recommendations[i]['name'] = info['recommendations'][i]['name'];


                        }
                    }
                }



            }

        }




        if(!notFirstTime)
        {
            preload();
        }


        var extra_css = "";
        var displayModal = false;


        var test = $(window).attr("height");
        var screenS = window.innerWidth;
        var screenS_Height = window.innerHeight;

        var frameSizeWidth = "375px;";


        var ModalFrameSizeWidth = "435px";
        var ModalFrameSizeHeight = "50px";

        var frameSizeHeight = "667px;";
        var frameSizeHeight_clean = 667;
        var frameContentScale = "100";

        var arrowTop = 323;



    //     if(screenS < 435)
    //     {
    //         var newScreen = Math.floor(screenS) - 60;
    //         frameSizeWidth =  newScreen+'px' ;
    //         frameSizeHeight_clean = ((newScreen/375)*667);
    //         arrowTop = parseFloat(frameSizeHeight_clean/2) - 10;
    //         frameSizeHeight =  ((newScreen/375)*667)+'px' ;
    //         frameContentScale =     ((newScreen/375)*100);
    //         ratio = parseFloat(newScreen/375);
    //         ModalFrameSizeWidth = screenS+"px";
    // //        ModalFrameSizeHeight = Math.floor(ratio*70)+"px";
    //     }



        if (currType.toLowerCase().localeCompare('step-by-step') == 0)
        {
            showArrows = true;
            showCloseButton = false;
            displayModal = false;


            diffTop = '0px';



            // if( info['meta']['ipad'])
            // {
            //     isIpad = true;
            //     ratio = 0.68;
            //
            //
            //
            //     ratio = (screenS_Height*0.75)/768;
            //     if(ratio < 0.68)
            //         ratio = 0.68;
            //
            //     // if(ratio > 0.95)
            //     //     ratio = 0.95;
            //
            //
            //     frameSizeWidth = parseFloat( Math.ceil(1024*ratio) ) + 'px;';
            //     frameSizeHeight = parseFloat( Math.ceil(768*ratio) ) + 'px;';
            //
            //
            // }


            // extra_css = 'box-shadow: none;';


            extraClass = '';
            if(isMobileDevice)
            {
                info['product']['player_type'] = 3;

                var factor = 1;

                if(isInIframe)
                {
                    mobileScreenWidth = 1024;
                    if(screenS_Height/screenS > 0.75) {
                        factor = screenS / 1024;// 1;//0.867;
                    }
                    else
                    factor =  screenS_Height/768;// 1;//0.867;




                    diffTop = '0px';
                }
                var w = mobileScreenWidth;

                ratio = mobileScreenWidth/1024*factor;

                ratio = 1;
                frameSizeWidth = '1024px;';
                frameSizeHeight = '768px;';

                $('.modal.ec').css('overflow','hidden');

                extraClass = 'isMobile';


            }




                //extra_css = 'box-shadow: none; '



            if(inVidRecording)
            {
                  ratio = 1;
            }


            urlContent = domain_prefix+'content.php?s='+curr_exp_id+'&r='+ratio;


            if(inVidRecording)
            {
                urlContent= urlContent+'&rec=t';
                if(fullHighDef)
                {
                    urlContent= urlContent+'&fhd=t';
                }
            }

            // var iframe = '<iframe  tabindex="-1" class="Shadow mobileMain '+extraClass+'" '+
            //     'src="'+urlContent+'"  width="'+frameSizeWidth+'"  height="'+frameSizeHeight+'"   frameborder="0" scrolling="no"></iframe>';
            var iframe = '<div tabindex="-1" class="Shadow mobileMain '+extraClass+'" '+
                'style="width:'+frameSizeWidth+'px; height:'+frameSizeHeight+'px; overflow: hidden;">'+info['screensHTML']+'</div>';

            modalHtmlFrame = '<div id="modal-content"  style="  '+extra_css+' width:'+frameSizeWidth+'; height:'+frameSizeHeight+'; margin-top:'+diffTop+'; z-index:1;">' +
                '<div class="blackCurtain " style=" width: 100%; height: 100%;     position: absolute; z-index: 10000; display: none;"></div>'+
                '<div class="overlayIframe" onclick="clickedOverlayIframe()"></div>' +
                '<div class="preInfo"> ' +
                '<img style="width:100%;position:absolute;" src="'+info["thumbnailURL"]+'">' +
                '</div><div class="postInfo"></div>'+iframe;
        }

        diffTop = ((screenS_Height - frameSizeHeight_clean)/2)+'px';

        if(displayModal)
        {
           modalHtmlFrame = modalHtmlFrame+'<div id="modalOV">' +
                        '<a class="btn-m  modal-button half-modal-button left-button" ">Download</a>'+
                        '<a class="btn-m  modal-button half-modal-button right-button" >Download</a>'+
                        '<p class="text-center small" style="margin-top: 5px;margin-bottom: 3px; text-align: center;   font-size: 0.7rem;">Powered By <span style="font-style: italic;">Elasticode</span></p>' +
                    '</div>';
        }



        var extraClass = '';
        if(stepByStepModal.toLowerCase().localeCompare('modal-dark') == 0)
        {
            extraClass = 'whiteC';
        }

        if(showCloseButton)
        {
            modalHtmlFrame = modalHtmlFrame+'<a href="#close" onclick="killModal()" title="Close" class="close">X</a>';
        }

        if(showArrows)
        {

            // add a display none for desktop
            var not_display = " display:none;";

            modalHtmlFrame = modalHtmlFrame+'<div onclick="leftClicked(\"h\")" id="leftClickArrow"  style=" '+not_display+' position: absolute; top: 0px; left:-30px; height:'+frameSizeHeight+';     width:30px;  ">' +
                                                    '<div>' +
                                                        '<span class="arrow arrow-left '+extraClass+'" style="top:'+arrowTop+'px !important;"></span>' +
                                                        '</div>' +
                                             '</div>' +
                                             '<div  onclick="rightClicked(\'h\')" id="rightClickArrow"   style=" '+not_display+' position: absolute; top: 0px; right:-30px; height:'+frameSizeHeight+'; width:30px; ">' +
                                                    '<div>' +
                                                        '<span class="arrow arrow-right '+extraClass+'" style="top:'+arrowTop+'px !important;"></span>' +
                                                    '</div>' +
                                              '</div>';

        }




        var wrapper= document.createElement('div');
        wrapper.innerHTML= modalHtmlFrame;
        var divNew = wrapper.firstChild;
    //    var mainBG = document.getElementById('ec_exp');
        var mainBG = document.getElementById('main-content');
        if(stepByStepModalAlignment == 1)
            mainBG.insertBefore(divNew , mainBG.childNodes[1] );
        else
            mainBG.insertBefore(divNew , mainBG.childNodes[0] );
        modalContent = document.getElementById('modal-content');

        _fleeqPlayer.createPlayerUI();
        didFrameLoad = true;
        if(isInIframe)
        {

            $('#main-content').css({'margin-left': '0px'});
            //$('.startPlay').css({'position': 'relative'});
            //$('.startPlay').css({'top': 'auto'});
            //$('.startPlay').css({'left': 'auto'});
            //$('.startPlay').css({'margin-left': parseFloat(frameWidth/2-30)+'px'});
            $('.mobileMain.isMobile').css({'border-radius': '0px'});
            //$('#ec_exp').css({'background': 'white'});
        }

        if($('#turnDeviceNotification').length == 0)
        {
            // var htmlFrameRotate = '<div id="turnDeviceNotification"><div class="content"><img src="/assets/images/shouldrotate.png"><div class="rotate-title"><span> Please turn your device</span></div></div></div>';
            // $('#ec_exp').prepend(htmlFrameRotate);
        }





        if(showArrows)
        {
            var arrowsTop = document.getElementsByClassName('arrow-left');
            arrowsTop[0].style.top = frameSizeHeight/2+'px';
            arrowsTop = document.getElementsByClassName('arrow-right');
            arrowsTop[0].style.top = frameSizeHeight/2+'px';
            leftArrowDiv = document.getElementById('leftClickArrow');
            rightArrowDiv = document.getElementById('rightClickArrow');
            leftArrowDiv.style.display = "none";
        }


        if(displayModal)
        {

            var myElement = document.querySelector("#modalOV");
            var b_left = document.querySelector(".left-button");
            var b_right = document.querySelector(".right-button");

            if( (info['data']['cta_1_enable'] == '0') && (info['data']['cta_2_enable'] == '0'))
            {
                myElement.style.display = 'none';
            }






            myElement.style.backgroundColor = "white";
            myElement.style.height = '75px';
            myElement.style.width = ModalFrameSizeWidth;
            myElement.style.position = 'absolute';
            myElement.style.bottom = '0px';
            myElement.style.left = '-30px';


            if(info['data'])
            {
                b_left.style.backgroundColor = info['data']['cta_1_bg'];
                b_left.style.color = info['data']['cta_1_color'];
                var font_info =  info['data']['cta_1_font'].split("_");
                b_left.style.fontFamily = font_info[0];
                b_left.style.fontWeight = font_info[1];
                b_left.innerHTML = info['data']['cta_1_text'];


                b_right.style.backgroundColor = info['data']['cta_2_bg'];
                b_right.style.color = info['data']['cta_2_color'];
                font_info =  info['data']['cta_2_font'].split("_");
                b_right.style.fontFamily = font_info[0];
                b_right.style.fontWeight = font_info[1];
                b_right.innerHTML = info['data']['cta_2_text'];
            }



        }







        // if(!isInIframe)
            // backgroundGradient($('#ec_exp'), 8);
        //$('#ec_exp').css('background-color', '#333');

        // $('html').css('background-color', info['info']['player_bg_color'])
        // $('body').css('background-color', info['info']['player_bg_color']);

        //$('#ec_exp').css('background-color', 'white');

        // modalContent.style.display = "none";



        var headerRTLClass = '';
        var ctaClass = 'pull-right';
        if(info['header_rtl'] == 1)
        {
            headerRTLClass = 'right';
            ctaClass = 'left';

        }
        var ctaInfo = '';

        if(CTA == '1')
        {
            if(info['info']['3rd_party_chat'] && (info['header_rtl'] != 1))
                ctaClass = ctaClass+' hide';
            ctaInfo = '<div class="CTAmainB '+ctaClass+'">' +
                            '<a onclick="runAction()" style="    cursor: pointer;">'+CTA_text+'</a>'+
                      '</div>';
        }



        var localizeSelectString = '';


        var topBarDisplayName = displayName;

        if(info['localization'] || info['localization_source'])
        {

            var localizationArray = info['localization_source'];
            if(info['localization'])
            {
                localizationArray = info['localization'];
            }

            var contentString = '';
            var allLang = localizationArray['languages'];
            var keys = [];
            for(var k in allLang) keys.push(k);
            for(var i = 0 ; i < keys.length ; i++)
            {
                contentString = contentString+'<li data-id="'+allLang[keys[i]]['lID']+'" data-value="'+allLang[keys[i]]['code_key']+'">'+allLang[keys[i]]['name']+'</li>';
            }
            localizeSelectString = '<div class="localization-div '+ctaClass+'"><div class="select localization-div-select">'+
                '  <span class="placeholder">Select your language</span>'+
                '  <ul>'+contentString+'  </ul>'+
                '  <input type="hidden" name="changeme"/>'+
                '</div></div>';




            var codeKeyForOrigin = false;
            if(info['localization_source'])
            {
                codeKeyForOrigin = info['localization_source']['languages'][info['localization_source']['defaultLanguageID']]['code_key'];
            }
            else
            {
                codeKeyForOrigin = info['localization']['languages'][info['localization']['defaultLanguageID']]['code_key'];
            }

                // set the origin link
                var linkVal = info['meta']['full_prefix']+'l/'+codeKeyForOrigin;
                topBarDisplayName = '<span>'+topBarDisplayName+'</span>';

        }




        var prefixCourseName ="";
        if((typeof inCourse !== 'undefined') && !isMobileDevice)
        {
            prefixCourseName = '<span class="course-header-prefix">'+courseName+' : </span>';
        }







        var c_attr_class= '';
        if(!attributionObj)
            c_attr_class= 'adjust';


        var topBar = '';
        if(showBottomAttribute){
            topBar = '<div class="topBar">' +
                '<div class="topBarContent">' +
                '<div class="logo-top-bar '+headerRTLClass+'   " >' +
                '<div id="mainLogo">'+info['product']['leftLogo']+'</div>' +
                '</div>' +
                '<div class="nameAndAttribution '+c_attr_class+'  '+headerRTLClass+' ">' +
                '<div class="display-name-top-bar '+headerRTLClass+' ">' +
                prefixCourseName+topBarDisplayName+
                '</div></div>'+
                ctaInfo +
                '</div>' +
                '</div>';
        }

        var courseIndication = '<div class="horizontal coursetimeline">' +
                                        '<div class="steps">' +
                                        '</div>' +
                                        '</div>';







        $('body').append('<div class="bottom-attribution"></div>');
        {
            $('.bottom-attribution').append(topBar);
            $('.displayInfoSection').css('display','none');
        }





        $('.CTAmainB').css('color', '#5a6e91');
        $('.CTAmainB a').css('color', '#5a6e91');
        $('.CTAmainB a').html(CTA_text);
        // $('.CTAmainB').css('border-color', grad_A);



        modalContent.style.opacity = 0;
        modalContent.style.visibility = 'hidden';
        if(!requireEmail)
            wait();


        else {

            popupEmail = ''+
            '<div class="askForEmail">' +
                '<div class="guideName">"'+displayName+'"</div>' +
                '<div class="headerContent">Please enter your email to view this guide</div>' +
                '<input class = "inputRequestEmail" placeholder="Your email">' +
                '<btn class="btnMailApprove">Let\'s start</btn>' +
                '<div class="attr"><span>Powered by</span><img src="/assets/images/attributionLogo.png"></div>' +
                '' +
                '</div>';
            $('#ec_exp').append(popupEmail);
            modalLoader.style.display = "none";
            $('.askFoEmail').center();
        }


        if(info['info']['3rd_party_chat'] && (info['header_rtl'] == 1) )
        {
            // Figure out the right margin to create
             $('.topBarContent').css('display','none');
            awaitOn3rdPartyChatIcon(info['info']['3rd_party_chat_type'])

        }



    }


    function awaitOn3rdPartyChatIcon(thirdPartyType)
    {


        if ( thirdPartyType == 'olark' ) {
            if ($('.olark-launch-button').length > 0) {
                $('.topBarContent').css('display','block');
                $('.logo-top-bar').css('margin-right', parseInt($('.olark-launch-button').width() + 70)+'px' );
                getHeightForBottomSection();

            } else {
                setTimeout(function(){
                    awaitOn3rdPartyChatIcon(thirdPartyType);
                }, 500);
            }
        }


        if ( thirdPartyType == 'userLike' ) {
            if ($('#userlike-tab').length > 0) {
                $('.topBarContent').css('display','block');
                $('.logo-top-bar').css('margin-right', parseInt($('#userlike-tab').width() + 100)+'px' );
                getHeightForBottomSection();

            } else {
                setTimeout(function(){
                    awaitOn3rdPartyChatIcon(thirdPartyType);
                }, 500);
            }
        }


        if ( thirdPartyType == 'convertFox' ) {
            if ($('.convertfox-chat-iframe').length > 0) {
                $('.topBarContent').css('display','block');
                $('.logo-top-bar').css('margin-right', parseInt($('.convertfox-chat-iframe').width() + 0)+'px' );
                getHeightForBottomSection();

            } else {
                setTimeout(function(){
                    awaitOn3rdPartyChatIcon(thirdPartyType);

                }, 500);
            }
        }



        if ( thirdPartyType == 'drift' ) {
            if ($('#drift-widget').length > 0) {
                getHeightForBottomSection();
                setTimeout(function() {

                    $('.topBarContent').css('display','block');

                    $('.logo-top-bar').css('margin-right', parseInt($('#drift-widget').width() + 30) + 'px');
                }, 2500);

            } else {
                setTimeout(function(){
                    awaitOn3rdPartyChatIcon(thirdPartyType);

                }, 500);
            }
        }


        if ( thirdPartyType == 'zendesk' ) {
            if ($('#launcher').length > 0) {

                getHeightForBottomSection();
                setTimeout(function() {
                    $('.topBarContent').css('display','block');
                    $('.logo-top-bar').css('margin-right', parseInt($('#launcher').width() + 30) + 'px');
                }, 1000);

            } else {
                setTimeout(function(){
                    awaitOn3rdPartyChatIcon(thirdPartyType);

                }, 500);
            }
        }


        if ( thirdPartyType == 'intercom' ) {
            if ($('.intercom-launcher-frame').length > 0) {
                getHeightForBottomSection();
                setTimeout(function() {
                    $('.topBarContent').css('display','block');
                    $('.logo-top-bar').css('margin-right', parseInt($('.intercom-launcher-frame').width() + 40) + 'px');
                }, 500);

            } else {
                setTimeout(function(){
                    awaitOn3rdPartyChatIcon(thirdPartyType);

                }, 500);
            }
        }





    }


    function setTihrdPartyChatInBottomRightBar(flag)
    {
        if(typeof info !== 'undefined')
        {

            if(typeof info['info'] !== 'undefined') {
                if (typeof info['info']['3rd_party_chat'] !== 'undefined') {
                    if (info['info']['3rd_party_chat_type'] == 'intercom') {
                        if (flag)
                            $('#intercom-container').css('display', 'block');
                        else
                            $('#intercom-container').css('display', 'none');
                    }

                    if (info['info']['3rd_party_chat_type'] == 'zendesk') {
                        if (flag)
                            $('#launcher').css('display', 'block');
                        else
                            $('#launcher').css('display', 'none');
                    }

                    if (info['info']['3rd_party_chat_type'] == 'drift') {
                        if (flag)
                            $('#drift-widget-container').css('display', 'block');
                        else
                            $('#drift-widget-container').css('display', 'none');
                    }

                    if (info['info']['3rd_party_chat_type'] == 'convertFox') {
                        if (flag)
                            $('#convertfoxChat').css('display', 'block');
                        else
                            $('#convertfoxChat').css('display', 'none');
                    }

                    if (info['info']['3rd_party_chat_type'] == 'olark') {
                        if (flag)
                            $('#hbl-live-chat-wrapper').css('display', 'block');
                        else
                            $('#hbl-live-chat-wrapper').css('display', 'none');
                    }


                    if (info['info']['3rd_party_chat_type'] == 'userLike') {
                        if (flag)
                            $('.userlike').css('display', 'block');
                        else
                            $('.userlike').css('display', 'none');
                    }
                }
            }
        }
    }


    var lockTopNavInCourse = false;

    $(document).on('click', '.horizontal.coursetimeline .steps .step', function (ev) {
        if(lockTopNavInCourse)
        {
            return 0 ;
        }
        lockTopNavInCourse = true;
        if(currAudio)
            currAudio.fade(1 ,0 ,125);
        var codeKey = $(this).data('code-key');
        var index = $(this).data('index');
      setTimeout(function(){
          if(currAudio)
            currAudio.stop();

          runNextGuide(codeKey, index)
       }, 130)

    })


    window.onclick = function(event) {
        if ((event.target == modal) && (modal != false) ) {
    //        killModal();
        }
    }



    function fireKey(el, key)
    {

        if(narration == '0')
        {
            document.onkeydown =  saved_keydown;
        }

        if(document.createEventObject)
        {
            var eventObj = document.createEventObject();
            eventObj.keyCode = key;
            el.fireEvent("onkeydown", eventObj);
        }else if(document.createEvent)
        {
            var eventObj = document.createEvent("Events");
            eventObj.initEvent("keydown", true, true);
            eventObj.which = key;
            el.dispatchEvent(eventObj);
        }
    }


    saved_keydown = function(evt) {


        if(isGif || !_isKeysEnabled)
            return;


        switch(evt.which) {



            case 32: // left



                if($('.wrapperForStartPlay').length > 0)
                {
                    removeSplash();
                    break;
                }


               if(pauseMode)
               {
                   moveToPlay(true)
               }
               else
               {
                   moveToPause(true);
               }

                evt.preventDefault();
                evt.stopPropagation();
                break;


            case 37: // left
    //            leftClicked('h');


                leftClicked('h');
                return;

                if(!canTransit)
                    return

                removeAllTimeOuts();
                muteAudio();
                if(!splashOn)
                {
                var iframeE = document.getElementsByClassName("mobileMain")[0];
                var currScreen =  _fleeqPlayer.currentScreen;

                    leftClicked('h');

                // jumpToScreen(currScreen-2);
                }

                evt.preventDefault();
                evt.stopPropagation();
                break;
            case 39: // right


                rightClicked('h');
                return;

                if(!canTransit)
                    return

    //            rightClicked('h');


                if(splashOn)
                {
                    removeSplash()
                }
                else
                {
                    removeAllTimeOuts();
                    muteAudio();
                    rightClicked('h')

                    // jumpToScreen(currScreen);
                }

                evt.preventDefault();
                evt.stopPropagation();
                break;
            default:
                evt = evt || window.event;
                var isEscape = false;
                if ("key" in evt) {
                    isEscape = (evt.key == "Escape" || evt.key == "Esc");
                } else {
                    isEscape = (evt.keyCode == 27);
                }
                if (isEscape && !noEsc() ) {
                    killModal();
                }



                return; // exit this handler for other keys
        }

        evt.preventDefault(); // prevent the default action (scroll / move caret)
    };




    // saved_keydown = document.onkeydown;




    simple_keydown = function(evt) {


        switch(evt.which) {


            default:

                evt = evt || window.event;
                var isEscape = false;
                if ("key" in evt) {
                    isEscape = (evt.key == "Escape" || evt.key == "Esc");
                } else {
                    isEscape = (evt.keyCode == 27);
                }
                if (isEscape && !noEsc()) {
                    killModal();
                }

                return; // exit this handler for other keys
        }

        evt.preventDefault(); // prevent the default action (scroll / move caret)
    };


    simple_keydown = document.onkeydown;

    document.onkeydown = simple_keydown;


    function bindAllClicks()
    {
        for (var i = 0; i < popupClass.length; i++) {
            popupClass[i].addEventListener('click', function() { runFlow(this, true); }, false);

        }

    }



    function noEsc()
    {
        if(typeof noEscpVar !== 'undefined')
        {
            return true;
        }
        else
        {
            return false;
        }
    }



    // function removeAlertBox()
    // {
    //     document.querySelector('#pre-alert-modal').style.display = 'none';
    //     document.querySelector('.alert-modal').style.display = 'none';
    // }
    //
    //
    // function alertModal()
    // {
    //
    //
    //     document.querySelector('#pre-alert-modal').style.display = 'block';
    //     document.querySelector('.alert-modal').style.display = 'block';
    //     document.querySelector('.alert-modal').style.left = parseFloat(parseFloat(window.innerWidth/2) - 300 )+'px';
    //
    // }

    function _getURLAdditionalParams(asObject) {
        var params = {};
        if(typeof list !== 'undefined' && list) {
            params['list'] = list;
        }
        if(typeof bar !== 'undefined' && bar) {
            params['bar'] = bar;
        }
        if(typeof wiki !== 'undefined' && wiki) {
            params['wiki'] = wiki;
        }
        if(typeof fCourse !== 'undefined' && fCourse) {
            params['fCourse'] = fCourse;
        }
        const paramKeys = Object.keys(params);
        if(paramKeys.length === 0){
            return asObject? false : "";
        }
        if(asObject){
            return params;
        }else {
            return paramKeys.map(function(key) {
                return key + '=' + params[key]
            }).join('&');
        }
    }




    function addRecommendations()
    {
        var output = '';


        var extraClass = '';
        if( (stepByStepModalFontColor.toLowerCase().localeCompare('white') == 0) || (stepByStepModalFontColor.toLowerCase().localeCompare('#ffffff') == 0))
        {
            extraClass = 'whiteC';
        }
        output = "<div class='recommend' style='display: none;'>";

        if(recommendations.length > 0)
        {
            output = output+'<h5 style="margin-left: 28px;"> You may also interested in:</h5>';
        }


        for (i = 0; i < recommendations.length ; i++) {
            output = output+"<div class='recommend-element'>" +
                                "<div class='recommend-box' box-id='"+i+"'>" +
                                        "<div class='content'></div>" +
                                "</div>" +
                            "</div>";
            getStepByStepRecommendations(recommendations[i]['exp_id'],i);
        }
        output = output+'</div>';
        var wrapper= document.createElement('div');
        wrapper.innerHTML= output;
        var divNew = wrapper.firstChild;
        //var mainBG = document.getElementsByClassName('modal')[0];
        var mainBG = document.getElementById('main-content');

    //    var mainBG = document.body.firstChild;
        mainBG.insertBefore(divNew , mainBG.childNodes[5] );



        if(CTA.toLowerCase().localeCompare('1') == 0)
        {
            var b_html = '<div class="button_cta" style="display: none;">Click me</div>';
            var wrapper= document.createElement('div');
            wrapper.innerHTML= b_html;
            var divNew = wrapper.firstChild;
    //        var mainBG = document.getElementsByClassName('modal')[0];
            var mainBG = document.getElementById('main-content');
            mainBG.insertBefore(divNew , mainBG.childNodes[6] );

        }


        if(Feedback.toLowerCase().localeCompare('1') == 0)
        {
            var b_html = '<div class="feedback" style="display: none;">' +
                '<h5 style="margin-left: 17px;"> Was this helpful?</h5>' +
                '<div class="left-up feedback-b up"><span class="feedback-b-image up"></span><span class="feedback-b-text"></span></div>' +
                                               '<div class="right-up feedback-b down"><span  class="feedback-b-image down"></span><span class="feedback-b-text"></span></div></div>';
            var wrapper= document.createElement('div');
            wrapper.innerHTML= b_html;
            var divNew = wrapper.firstChild;
    //        var mainBG = document.getElementsByClassName('modal')[0];
            var mainBG = document.getElementById('main-content');
            mainBG.insertBefore(divNew , mainBG.childNodes[7] );

        }



    }




    $(window).unload(function() {

    })

    function    readDeviceOrientation() {


        if(!captions)
        {
            $('#single-quote.bottom').css('display','none');
            $('#single-quote .content.mobile').remove();
        }



        if(typeof previewAcademyPage != 'undefined')
        {
            detectOrientation();
            return 0;
        }



        var lascp = false;
        if(inVidRecording)
        {
            lascp = true;
        }
        else
        {
            if(typeof window.orientation !== 'undefined')
            {
                // we are on aa real device
                if(Math.abs(window.orientation) === 90)
                {
                    lascp = true;
                }
            }
            else
            {
                // in simulator / chrome

                // if (screen.orientation.angle !=  0)
                // {
                //     lascp = true;
                // }
            }
        }




        var innerFrameWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
        var innerFrameHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);



        currScreenHeight = $('.preInfo').innerHeight();
        currScreenWidth = $('.preInfo').innerWidth();



        if(!isMobileDevice)
        {
            $('.timeline').addClass('fullScreen');
            // $('.timeline.ffullScreen .tl').css('width', (ratio*1024 - 195)+'px');
            $('.timeline.fullScreen .tl').css('width', '100%');
            // $('.timeline.fullScreen .tl-hover-layer').css('width', (ratio*1024 - 195)+'px');
            $('.timeline.fullScreen .tl-hover-layer').css('width', '100%');
            $('.bottom-vid-drawer').css('top', (Math.floor(ratio*768) - 37)+'px');
            $('.timeline.fullScreen').css('top', (Math.floor(ratio*768) - $('.bottom-vid-drawer').height() -2)+'px');


        }


        if(isInIframe) {


            var diff = parseFloat(innerFrameHeight - currScreenHeight) / 2
            if (inVidRecording) {
                diff = 0;
            }
            $('.preInfo').css({'margin-top': diff + 'px'});
            $('.postInfo').css({'margin-top': diff + 'px'});


            var diffLeft = parseFloat(innerFrameWidth - currScreenWidth) / 2

            $('.preInfo').css({'margin-left': diffLeft + 'px'});
            $('.postInfo').css({'margin-left': diffLeft + 'px'});


            // $('#main-content').css('margin-left', '10px');
            // $('#main-content').css('margin-top', '10px');

            var w = frameWidth - mobileScreenWidth - 20;

            var topVal = 215;
            if (frameWidth > 700 && frameWidth <= 800) {
                topVal = 235;
            }
            if (frameWidth > 800 && frameWidth <= 900) {
                topVal = 260;
            }
            if (frameWidth > 900 && frameWidth <= 1000) {
                topVal = 310;
            }


            $('.underHover').css('width', '100%');

            if ((window.name != 'academy') && (window.name != 'courseFrame')
                && (window.name != 'inlineSolo') && (window.name != 'inlineSoloMini') && (window.name != 'wide') && (window.name != 'inlineSoloBig') && (window.name != 'inlineSoloBigNoCTA')) {





                // $('#ec_exp').prepend(svgValInIframe);
            }
            else {



                // if ((window.name == 'inlineSoloBig') || (window.name == 'inlineSoloBigNoCTA')) {
                //     $('#modal-content').css('left', '0px');
                //     $('#modal-content').css('top', '0x');
                //     $('#modal-content').css('margin-top', '0px');
                //     $('.bottom-vid-drawer.isMobile.inFrame').css('left', '190px');
                //     $('.bottom-vid-drawer.isMobile.inFrame').css('top', '493px');
                //     $('.allFullScreenDiv.isMobile').css('opacity', '0');
                //     $('.timeline').addClass('fullBig');
                //     $('#main-content').addClass('fullBig');
                //     $('.bottom-vid-drawer').addClass('fullBig');
                //
                //     // $('.bottom-vid-drawer.isMobile.inFrame .underHover').css('width', '740px');
                //     $('.bottom-vid-drawer.isMobile.inFrame .underHover').css('left', '0px');
                //
                //     $('#single-quote.bottom .content').css({'font-size': '1.4rem'});
                //     $('#single-quote.bottom .content').css({'line-height': '1.8rem'});
                //     $('#single-quote.bottom .content').css({'top': '10px'});
                //     // $('#single-quote.bottom ').css({'left' :'49px'});
                //
                //
                //     if (inVidRecording) {
                //
                //
                //         $('#single-quote.bottom .content').css({'font-size': '22px'});
                //         $('#single-quote.bottom .content').css({'line-height': '22px'});
                //         $('#single-quote.bottom .content').css({'font-weight': '500'});
                //         $('#single-quote.bottom .content').css({'width': '1024px'});
                //         $('#modal-content').css('border-top-left-radius', '0px');
                //         $('.left-top-logo-container').css('display', 'none');
                //
                //         if (inVidRecordingCapOff) {
                //             $('#single-quote.bottom').css({'margin-top': '1000px'});
                //         }
                //
                //
                //     }
                //
                // }




            }
            // $('#single-quote.isMobile').css('height', mobileScreenHeight + 'px');





            $('.bottom-vid-drawer.isMobile.inFrame').css('left', '0px');
            $('.bottom-vid-drawer.isMobile.inFrame').css('width', '100%');

            $('.timeline .tl').css('width', '100%');
            $('.timeline .tl-hover-layer').css('width', '100%');
            $('.timeline').css('top', 'auto');
            $('.timeline').css('bottom',  ($('.underHover').height() +30)+'px');
            $('.bottom-vid-drawer.isMobile.inFrame').css('top', 'auto');
            $('.bottom-vid-drawer.isMobile.inFrame').css('bottom', '0px');
            $('.bottom-vid-drawer.isMobile.inFrame').css('left', '0px');
            $('.bottom-vid-drawer.isMobile.inFrame').css('width', '100%');


        }






        if (lascp && !isInIframe && isMobileDevice) {
            // Landscape

            $('#turnDeviceNotification .content').css('display','none');
            $('#turnDeviceNotification').fadeIn(10, function(){
                setTimeout(function(){
                    $('#turnDeviceNotification .content').fadeIn('fast');
                }, 500);
            });
           document.getElementById('turnDeviceNotification').style.display = 'block';
        }


        if (!lascp && !isInIframe && isMobileDevice) {
            // Portrait







            $('.timeline').addClass('mobileTimeline');

            $('.timeline').css('display','none');
            $('.timeline').css('position','absolute');
            w = mobileScreenWidth*0.7;
             $('.timeline').css('width',w+'px');
            $('.timeline').css('height','40px');
            $('.timeline').css('top','371px');
            $('.timeline').css('left','5%');
            $('.timeline').css('overflow','hidden');


            if(info['in_course'])
            {
                if($('#single-quote .toggleOverlay.mobileInCourse').length == 0)
                    $('#single-quote').append('<div class="toggleOverlay mobileInCourse"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 27.14 21.43"><title>Menu</title><g id="Layer_2" data-name="Layer 2"><g id="Layer_2-2" data-name="Layer 2"><g id="list"><g id="_399-list1.png" data-name="399-list1.png"><path d="M2.14,4.29H25A2.14,2.14,0,1,0,25,0H2.14a2.14,2.14,0,0,0,0,4.29ZM25,17.14H2.14a2.14,2.14,0,0,0,0,4.29H25a2.14,2.14,0,1,0,0-4.29Zm0-8.57H2.14a2.14,2.14,0,0,0,0,4.29H25a2.14,2.14,0,1,0,0-4.29Z" style="fill:#9a9bb0"/></g></g></g></g></svg></div>');
            }
            else
            {
                if($('#single-quote .closeModalInPostInfoText').length == 0)
                    $('#single-quote').append('<div class="closeModalInPostInfoText">X</div>');

            }



            // document.getElementById('turnDeviceNotification').style.display =  'none';

            $('#turnDeviceNotification .content').hide();
            setTimeout(function(){
                $('#turnDeviceNotification').fadeOut('fast');
            },500);


            var diff = parseFloat(frameHeight - mobileScreenWidth*0.75)/2
            $('.preInfo').css({'margin-top': diff+'px'});
            $('.postInfo').css({'margin-top': diff+'px'});

            $('.preInfo').css({'margin-left': '0px'});
            $('.postInfo').css({'margin-left': '0px'});




            var diff = (mobileScreenHeight - 360)  / 4
            $('.preInfo').css({'margin-top': diff+'px'});


            if(isMobileDevice)
                $('#main-content').css('margin', '0px auto');
            var w = mobileScreenWidth;
            $('#single-quote.isMobile').css('width',w+'px');

            $('#single-quote.isMobile').css('position','relative');
            //$('#single-quote').css('width','375px');

            diff = parseFloat(mobileScreenWidth - 200)/2
            $('.bottom-vid-drawer.isMobile').css('left',diff+'px');
            $('.bottom-vid-drawer.isMobile').css('top','190px');


            diff = parseFloat(mobileScreenWidth - 60)/2
            $('.loaderaudioWave').css('left',diff+'px');
            $('.loaderaudioWave').css('top','195px');



            if(mobileScreenHeight < 600)
            {
                $('.bottom-vid-drawer.isMobile').css('top','140px');
            }
            $('#ec_exp').closest('html').css('overflow', 'hidden');


            diff = parseFloat(mobileScreenWidth - 40)/2

            //$('#single-quote .closeModalInPostInfoText').css('left',diff+'px');



            var number = ((w/(1024*0.68))*2.2)*1.3;
            if(isInIframe)
            {
                number = number/1.3;
            }
            var rounded = Math.round( number * 10 ) / 10;
            var final = rounded.toFixed(1);
            var finalH = parseFloat( final ) + 0.6 ;

            $('#single-quote.isMobile .content').css('font-size',final+'rem');
            $('#single-quote.isMobile .content').css('line-height',finalH+'rem');
            $('#single-quote.isMobile .content').css('margin','0px');
            $('#single-quote.isMobile .content').css('padding','5px 17px');


            if(window.name == 'y-mobile')
            {
                $('#single-quote.isMobile .content').css('font-size','11px');
                $('#single-quote.isMobile .content').css('line-height','15px');
                $('.noNarration').css('font-size','11px');
                $('.sound-status.isMobile').css('width','32px');
                $('.sound-status.isMobile').css('height','32px');
                $('.sound-status.isMobile').addClass('y-mobile');
            }


            $('#single-quote.isMobile').css('float','auto');
            $('#single-quote.isMobile').css('margin-top','10px');
            $('#single-quote.isMobile .title').css('text-align','auto');
            $('#single-quote.isMobile .content').css('text-align','auto');


            $('.bottom-vid-drawer.isMobile .next-dir').css('top','11px');
            $('.bottom-vid-drawer.isMobile .next-dir').css('left','3px');

            $('.bottom-vid-drawer.isMobile').css('width','150px');
            diff = parseFloat(mobileScreenWidth - 150)/2 + 16;
            $('.bottom-vid-drawer.isMobile').css('left',diff+'px');
            $('.displayIndication > div').css('text-align','left');


            var bgHeight = 15 - parseInt(mobileScreenHeight*0.015);
            $('#runningbg.isMobile > canvas').css('height', bgHeight+'px');

            $('.displayIndication .truncate').css('margin-left', '20px');
            $('.displayIndication .truncate').css('font-weight', '700');
            $('.displayIndication .truncate').css('font-size', '16px');

        }




    }




function doOnOrientationChange() {


        setTimeout(function(){
            sizeFAQ();
            $('.modal.ec').fadeIn('fast');
        },500)


    // setTimeout(function(){
    //
    // },800)
    // switch(window.orientation) {
    //     case -90 || 90:
    //         // alert(window.orientation);
    //
    //         break;
    //     default:
    //         // alert(window.orientation);
    //         sizeFAQ();
    //         break;
    // }
}

window.addEventListener('orientationchange', function(){ $('.modal.ec').css('display','none'); doOnOrientationChange();} );

// Initial execution if needed
doOnOrientationChange();


    // window.onorientationchange = readDeviceOrientation;


    function createXMLHttp() {
        //If XMLHttpRequest is available then using it
        if (typeof XMLHttpRequest !== undefined) {
            return new XMLHttpRequest;
            //if window.ActiveXObject is available than the user is using IE...so we have to create the newest version XMLHttp object
        } else if (window.ActiveXObject) {
            var ieXMLHttpVersions = ['MSXML2.XMLHttp.5.0', 'MSXML2.XMLHttp.4.0', 'MSXML2.XMLHttp.3.0', 'MSXML2.XMLHttp', 'Microsoft.XMLHttp'],
                xmlHttp;
            //In this array we are starting from the first element (newest version) and trying to create it. If there is an
            //exception thrown we are handling it (and doing nothing ^^)
            for (var i = 0; i < ieXMLHttpVersions.length; i++) {
                try {
                    xmlHttp = new ActiveXObject(ieXMLHttpVersions[i]);
                    return xmlHttp;
                } catch (e) {
                }
            }
        }
    }


    if( !(typeof  get_points_na_flag !== 'undefined') )
    {
        //setTimeout(function() { getPoints(); }, 2000);
    }
    else
    {
        bindAllClicks();
    }





    // Video controlls




    function getPosition(event)
    {
        var x = event.x;
        var y = event.y;

    //         var canvas = document.getElementById("canvas");

        x -= bgSliderWrapper.offsetLeft;
        y -= bgSliderWrapper.offsetTop;

        alert("x:" + x + " y:" + y);
    }



    var x, y = 0;       // variables that will contain the coordinates

    // Get X and Y position of the elm (from: vishalsays.wordpress.com)
    function getXYpos(elm) {
        x = elm.offsetLeft;        // set x to elm’s offsetLeft
        y = elm.offsetTop;         // set y to elm’s offsetTop

        elm = elm.offsetParent;    // set elm to its offsetParent

        //use while loop to check if elm is null
        // if not then add current elm’s offsetLeft to x
        //offsetTop to y and set elm to its offsetParent
        while(elm != null) {
            x = parseInt(x) + parseInt(elm.offsetLeft);
            y = parseInt(y) + parseInt(elm.offsetTop);
            elm = elm.offsetParent;
        }

        // returns an object with "xp" (Left), "=yp" (Top) position
        return {'xp':x, 'yp':y};
    }

    // Get X, Y coords, and displays Mouse coordinates
    function getCoords(e) {
        // coursesweb.net/
        var xy_pos = getXYpos(bgSliderBg);

        // if IE
        if(navigator.appVersion.indexOf("MSIE") != -1) {
            // in IE scrolling page affects mouse coordinates into an element
            // This gets the page element that will be used to add scrolling value to correct mouse coords
            var standardBody = (document.compatMode == 'CSS1Compat') ? document.documentElement : document.body;

            x = event.clientX + standardBody.scrollLeft;
            y = event.clientY + standardBody.scrollTop;
        }
        else {
            x = e.pageX;
            y = e.pageY;
        }

        x = x - xy_pos['xp'];
        y = y - xy_pos['yp'];

        // displays x and y coords in the #coords element
    //         alert('X= '+ x+ ' ,Y= ' +y);

        changedPosition(x)
    }


    function soundOnVid()
    {
        volOnB.style.display = 'none';
        volOffB.style.display = 'block';
    }

    function soundOffVid()
    {
        volOnB.style.display = 'block';
        volOffB.style.display = 'none';
    }

    function centerVideoOnScreen()
    {
        var currWidth = window.innerWidth;



    }



    function detailsOnVid()
    {

        if(info['product']['player_type'] == 2) {


            document.querySelector('.desk.accordion.arrows ').style.opacity = 1;

            if (targetElm) {

                anime({
                    targets: '.desk.accordion.arrows ',
                    left: '689px',
                    duration: 800,
                    easing: 'linear',
                    complete: function () {
                        anime({
                            targets: '.timeline',
                            opacity: 0,
                            duration: 200,
                            easing: 'linear'
                        });
                    }


                });
            }
            else {
                centerVideoOnScreen();
            }
        }




        if(single_quote || isMobileDevice) {


            var w = window.innerWidth;
            if(isMobileDevice)
            {
                w = mobileScreenWidth;
            }


            if (side_quote) {
                if (document.querySelector('#single-quote')) {
                    document.querySelector('#single-quote').style.opacity = 1;





                    var currWidth = w;
                    var leftMain = parseFloat(currWidth / 2 - 700);
                    document.querySelector('#single-quote').style.marginLeft = parseFloat(leftMain) + 'px';


                    anime({
                        targets: '#single-quote',
                        translateX: '760px',
                        duration: 800,
                        easing: 'linear',
                        complete: function () {


                            var currWidth = w;
                            var leftMain = parseFloat(currWidth / 2 - 700);
                            if($('#single-quote'))
                            {
                                $('#single-quote').css('left','0px');
                                $('#single-quote').css('transform' , 'none' );
                                $('#single-quote').css('marginLeft', parseFloat(760 + leftMain) + 'px' ) ;
                            }



                            anime({
                                targets: '.timeline',
                                opacity: 0,
                                duration: 200,
                                easing: 'linear'
                            });
                        }


                    });
                }
            }
            else {
                var currWidth = w;
                var leftMain = parseFloat(currWidth / 2 - 700);
                if (document.querySelector('#single-quote')) {
                    document.querySelector('#single-quote').style.left = '0px';
                    document.querySelector('#single-quote').style.transform = 'none';
                    //document.querySelector('#single-quote').style.marginLeft = parseFloat(760 + leftMain) + 'px';
                }


                anime({
                    targets: '.timeline',
                    opacity: 0,
                    duration: 200,
                    easing: 'linear'
                });

                anime({
                    targets: '#single-quote',
                    opacity: 1,
                    duration: 250,
                    easing: 'linear'
                });

            }
        }

    }

    function detailsOffVid()
    {

        anime({
            targets:'.desk.accordion.arrows ',
            left: '00px',
            duration: 800,
            easing: 'linear',
            complete: function(){
                document.querySelector('.desk.accordion.arrows ').style.opacity = 0;
                anime({
                    targets: '.timeline',
                    opacity: 1,
                    duration: 200,
                    easing: 'linear',
                    complete: function(){


                        anime({
                            targets: '.timeline',
                            opacity: 0,
                            delay: 1000,
                            duration: 200,
                            easing: 'linear',
                            complete: function(){

                            }

                        });

                    }

                });
            }
        });





    }

    function playVid()
    {
        if(!playing)
        {

            if(playB != undefined)
                playB.style.display = 'none';


            if(pauseB != undefined)
                pauseB.style.display = 'block';

            playing = true;
            measure = performance.now();
    //            var bg = document.getElementsByClassName('controller-bg')[0];
    //            var bgW =  bg.clientWidth;

            animMainBar = anime({
                targets: '.controller-bg',
                width: maxW+'px',
                duration: time,
                easing: 'linear'
            });

            animMainBarPoint = anime({
                targets: '.controller-bg-point',
                left: maxW+'px',
                duration: time,
                easing: 'linear'
            });
        }

    }

    function changedPosition(x)
    {
        // re-calc time

        var saveMode = playing;
        pauseVid();
        var pos =  maxW - x;

        bgSliderPoint.style.left = x+'px';
        bgSlider.style.width = x+'px'
        time = pos/maxW*org_time


    }



    function _pingTrack(currStep){
        if(typeof currStep === 'undefined'){
            currStep =  _fleeqPlayer.currentScreen;
        }

        track('i-guide', currStep, false);
        send3rdPartyAnalytics("View step", currStep);
    }

    preloadImages([_expWebCDN+'/playLightBox.png',
        _expWebCDN+'/pauseLightBox.png',
        _expWebCDN+'/pause_small.png' ,
        _expWebCDN+'/mute_small.png']);

    function notifyTrackDone(){
        if(parent && typeof fCourse !== 'undefined'){
            parent.postMessage("track-done",full_domain_link);
        }
    }


var _delayedTrackingEvents = [];
function track(typeVal, data, cid) {
    if (shouldTrack) {
        var shouldSendC = true;
        var preData = {
            type: "start",
            uid: trackingId,
            //"email": endUserEmail,
            code: trackingCode,
            gid: info['prod_guide_id'],
            source: trackSource
        };
        if ((typeVal === 'i-guide') && data) {
            if(!_trackingStarted){
                _delayedTrackingEvents.push({typeVal:typeVal, data:data, cid:cid});
                return;
            }
            preData = {
                "type": "i-guide",
                "uid": trackingId,
                "s-index": data,
                "gid": info['prod_guide_id']
            };
            shouldSendC = false;
        }
        if ((typeVal === 'start-at') && data) {
            preData = {
                "type": "start-at",
                "uid": trackingId,
                "s-index": data,
                "gid": info['prod_guide_id'],
                "code": trackingCode,
                "source": trackSource
            };
        }
        if (inCourseFlag) {
            preData["cid"] = inCourse;
            inCourseFlag = false;
        }
        const additionalParams = _getURLAdditionalParams(true);
        if(additionalParams) {
            preData["context"] = additionalParams;
        }
        var opt = {
            type: "POST",
            url: apiDomainURL + "/ajax/actions/tracking.php",
            data: JSON.stringify(preData),
            success: function () {
                if(preData['type'] === 'start' || preData['type'] === 'start-at'){
                    _trackingStarted = true;
                    $(_delayedTrackingEvents).each(function(elm){
                        track(elm.typeVal, elm.data, elm.cid);
                    });
                    _delayedTrackingEvents = [];
                }
                notifyTrackDone();
            },
            error: function (dataString) {}
        };
        if(shouldSendC){
            opt['xhrFields'] = {
                withCredentials: true
            };
        }
        $.ajax(opt);
    }
}
function updateAnalytics(idVal, webExpType , interactionType, feedback) {

    if(!trackAnalyticsFlag)
        return 0;

    var b = get_clean_hostname(window.location.href);
    var options = {
        'webExpId': idVal ,
        'type': webExpType,
        'feedback' : feedback,
        'interactionType' : interactionType,
        referrer: document.referrer
    };
    if(typeof trackingId !== "undefined"){
        options['uid'] = trackingId;
    }
    const additionalParams = _getURLAdditionalParams(true);
    if(additionalParams){
        options['context'] = additionalParams;
    }
    $.ajax({
        url: apiDomainURL+"/ajax/actions/webExp/addAnalyticsFeedback.php" ,
        type: "POST",
        dataType: "json",
        data: JSON.stringify(options),
        success: function (data) {
        },
        error: function(){
            return 0;
        }
    });
}
function getData(code_key, type , index, cache) {
    document.onkeydown = simple_keydown;
    if(!cache)
        curr_code_key = code_key;
    var extra = '';
    if(draft_mode_set)
    {
        extra = '&d=on';
    }

    var reqUrl = domain_prefix+'webexp.php?e='+code_key+extra;
    if(type == 'faq-link')
    {
        reqUrl = domain_prefix+'faq.php?e='+code_key;
    }


    if(index)
    {
        if(index)
        {
            reqUrl = reqUrl+'&index='+index;
        }
    }

    if(typeof inAcademy !== 'undefined')
    {
        if(inAcademy)
        {
            reqUrl = reqUrl+'&inAcademy='+inAcademy;
        }
    }

    const additionalParams = _getURLAdditionalParams();
    if(additionalParams.length > 0) {
        reqUrl += '&'+additionalParams;
    }

    if(typeof skipCourseScreen !== 'undefined')
    {
        if(skipCourseScreen)
        {
            reqUrl = reqUrl+'&shouldSkip=t';
        }
    }

    if(typeof inMobile !== 'undefined')
    {
        if(inMobile)
        {
            reqUrl = reqUrl+'&inMobile=t';
        }
    }

    if(typeof inDraft !== 'undefined')
    {
        if(inDraft)
        {
            reqUrl = reqUrl+'&inDraft=t';
        }
    }

    if(typeof kb_id !== 'undefined')
    {
        if(kb_id)
        {
            reqUrl = reqUrl+'&inAcademy='+kb_id;
        }
    }
    reqUrl += '&referrer='+btoa((window.location != window.parent.location)
        ? document.referrer
        : document.location.href);




    var xmlHttp = createXMLHttp();
    xmlHttp.open('get', reqUrl  , true);
    xmlHttp.send(null);
    xmlHttp.onreadystatechange = function() {
        if (xmlHttp.readyState === 4) {
            if (xmlHttp.status === 200) {
                //                return(xmlHttp.responseText);

                if(cache)
                {
                    cached_fleeq_response[code_key] = xmlHttp.responseText;

                }
                else
                {
                    assignAndLoadPopup(xmlHttp.responseText);
                    cached_fleeq_response[code_key] = xmlHttp.responseText;
                }


            } else {
                window.location.assign(full_domain_link);
                return -1;
            }
        } else {
            //still processing
        }
    };
}
function getStepByStepRecommendations(exp_id, location) {


    var reqUrl = 'https://"+domain+"/ajax/actions/webExp/getScreen.php?r=0.5&i=0&s='+exp_id;
    var xmlHttp = createXMLHttp();
    xmlHttp.open('get', reqUrl  , true);
    xmlHttp.send(null);
    xmlHttp.onreadystatechange = function() {
        if (xmlHttp.readyState === 4) {
            if (xmlHttp.status === 200) {

                var data =  JSON.parse(xmlHttp.responseText);
                var screen = data['content'];
                document.querySelector('.recommend-box[box-id="'+location+'"] .content').innerHTML = screen;

            } else {
                return -1;
            }
        } else {
            //still processing
        }
    };
}


