(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(["exports", "./callbacks-invoker.js", "../utils/js.js"], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports, require("./callbacks-invoker.js"), require("../utils/js.js"));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports, global.callbacksInvoker, global.js);
    global.eventify = mod.exports;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : this, function (_exports, _callbacksInvoker, _js) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.Eventify = Eventify;

  function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

  function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

  function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

  function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

  function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

  function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

  function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

  /**
   * @en Generate a new class from the given base class, after polyfill all functionalities in [[IEventified]] as if it's extended from [[EventTarget]]
   * @zh 生成一个类，该类继承自指定的基类，并以和 [[EventTarget]] 等同的方式实现了 [[IEventified]] 的所有接口。
   * @param base The base class
   * @example
   * ```ts
   * class Base { say() { console.log('Hello!'); } }
   * class MyClass extends Eventify(Base) { }
   * function (o: MyClass) {
   *     o.say(); // Ok: Extend from `Base`
   *     o.emit('sing', 'The ghost'); // Ok: `MyClass` implements IEventified
   * }
   * ```
   */
  function Eventify(base) {
    var Eventified = /*#__PURE__*/function (_ref) {
      _inherits(Eventified, _ref);

      function Eventified() {
        var _getPrototypeOf2;

        var _this;

        _classCallCheck(this, Eventified);

        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        _this = _possibleConstructorReturn(this, (_getPrototypeOf2 = _getPrototypeOf(Eventified)).call.apply(_getPrototypeOf2, [this].concat(args)));
        _this._callbackTable = (0, _js.createMap)(true);
        return _this;
      }

      _createClass(Eventified, [{
        key: "once",
        value: function once(type, callback, target) {
          return this.on(type, callback, target, true);
        }
      }, {
        key: "targetOff",
        value: function targetOff(typeOrTarget) {
          this.removeAll(typeOrTarget);
        }
      }]);

      return Eventified;
    }(base);

    ; // Mixin with `CallbacksInvokers`'s prototype

    var callbacksInvokerPrototype = _callbacksInvoker.CallbacksInvoker.prototype;
    var propertyKeys = Object.getOwnPropertyNames(callbacksInvokerPrototype).concat(Object.getOwnPropertySymbols(callbacksInvokerPrototype));

    for (var iPropertyKey = 0; iPropertyKey < propertyKeys.length; ++iPropertyKey) {
      var propertyKey = propertyKeys[iPropertyKey];

      if (!(propertyKey in Eventified.prototype)) {
        var propertyDescriptor = Object.getOwnPropertyDescriptor(callbacksInvokerPrototype, propertyKey);

        if (propertyDescriptor) {
          Object.defineProperty(Eventified.prototype, propertyKey, propertyDescriptor);
        }
      }
    }

    return Eventified;
  }
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImU6L2QwMDQ1MjUyMC9HaXRodWIvZW5naW5lL2NvY29zL2NvcmUvZXZlbnQvZXZlbnRpZnkudHMiXSwibmFtZXMiOlsiRXZlbnRpZnkiLCJiYXNlIiwiRXZlbnRpZmllZCIsIl9jYWxsYmFja1RhYmxlIiwidHlwZSIsImNhbGxiYWNrIiwidGFyZ2V0Iiwib24iLCJ0eXBlT3JUYXJnZXQiLCJyZW1vdmVBbGwiLCJjYWxsYmFja3NJbnZva2VyUHJvdG90eXBlIiwiQ2FsbGJhY2tzSW52b2tlciIsInByb3RvdHlwZSIsInByb3BlcnR5S2V5cyIsIk9iamVjdCIsImdldE93blByb3BlcnR5TmFtZXMiLCJjb25jYXQiLCJnZXRPd25Qcm9wZXJ0eVN5bWJvbHMiLCJpUHJvcGVydHlLZXkiLCJsZW5ndGgiLCJwcm9wZXJ0eUtleSIsInByb3BlcnR5RGVzY3JpcHRvciIsImdldE93blByb3BlcnR5RGVzY3JpcHRvciIsImRlZmluZVByb3BlcnR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQXFIQTs7Ozs7Ozs7Ozs7Ozs7QUFjTyxXQUFTQSxRQUFULENBQTBCQyxJQUExQixFQUFzRjtBQUFBLFFBQ25GQyxVQURtRjtBQUFBOztBQUFBO0FBQUE7O0FBQUE7O0FBQUE7O0FBQUE7QUFBQTtBQUFBOztBQUFBO0FBQUEsY0FFN0VDLGNBRjZFLEdBRTVELG1CQUFVLElBQVYsQ0FGNEQ7QUFBQTtBQUFBOztBQUFBO0FBQUE7QUFBQSw2QkFJN0NDLElBSjZDLEVBSTVCQyxRQUo0QixFQUlSQyxNQUpRLEVBSVM7QUFDMUYsaUJBQU8sS0FBS0MsRUFBTCxDQUFRSCxJQUFSLEVBQWNDLFFBQWQsRUFBd0JDLE1BQXhCLEVBQWdDLElBQWhDLENBQVA7QUFDSDtBQU5vRjtBQUFBO0FBQUEsa0NBUW5FRSxZQVJtRSxFQVFwQztBQUM3QyxlQUFLQyxTQUFMLENBQWVELFlBQWY7QUFDSDtBQVZvRjs7QUFBQTtBQUFBLE1BQy9EUCxJQUQrRDs7QUFXeEYsS0FYd0YsQ0FhekY7O0FBQ0EsUUFBTVMseUJBQXlCLEdBQUdDLG1DQUFpQkMsU0FBbkQ7QUFDQSxRQUFNQyxZQUFpQyxHQUNsQ0MsTUFBTSxDQUFDQyxtQkFBUCxDQUEyQkwseUJBQTNCLENBQUQsQ0FBK0VNLE1BQS9FLENBQ0lGLE1BQU0sQ0FBQ0cscUJBQVAsQ0FBNkJQLHlCQUE3QixDQURKLENBREo7O0FBR0EsU0FBSyxJQUFJUSxZQUFZLEdBQUcsQ0FBeEIsRUFBMkJBLFlBQVksR0FBR0wsWUFBWSxDQUFDTSxNQUF2RCxFQUErRCxFQUFFRCxZQUFqRSxFQUErRTtBQUMzRSxVQUFNRSxXQUFXLEdBQUdQLFlBQVksQ0FBQ0ssWUFBRCxDQUFoQzs7QUFDQSxVQUFJLEVBQUVFLFdBQVcsSUFBSWxCLFVBQVUsQ0FBQ1UsU0FBNUIsQ0FBSixFQUE0QztBQUN4QyxZQUFNUyxrQkFBa0IsR0FBR1AsTUFBTSxDQUFDUSx3QkFBUCxDQUFnQ1oseUJBQWhDLEVBQTJEVSxXQUEzRCxDQUEzQjs7QUFDQSxZQUFJQyxrQkFBSixFQUF3QjtBQUNwQlAsVUFBQUEsTUFBTSxDQUFDUyxjQUFQLENBQXNCckIsVUFBVSxDQUFDVSxTQUFqQyxFQUE0Q1EsV0FBNUMsRUFBeURDLGtCQUF6RDtBQUNIO0FBQ0o7QUFDSjs7QUFFRCxXQUFPbkIsVUFBUDtBQUNIIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEBjYXRlZ29yeSBldmVudFxyXG4gKi9cclxuXHJcbmltcG9ydCB7IENhbGxiYWNrc0ludm9rZXIgfSBmcm9tICcuL2NhbGxiYWNrcy1pbnZva2VyJztcclxuaW1wb3J0IHsgY3JlYXRlTWFwIH0gZnJvbSAnLi4vdXRpbHMvanMnO1xyXG5cclxudHlwZSBDb25zdHJ1Y3RvcjxUID0ge30+ID0gbmV3ICguLi5hcmdzOiBhbnlbXSkgPT4gVDtcclxuXHJcbnR5cGUgRXZlbnRUeXBlID0gc3RyaW5nO1xyXG5cclxuLyoqXHJcbiAqIEB6aFxyXG4gKiDlrp7njrDor6XmjqXlj6PnmoTlr7nosaHlhbfmnInlpITnkIbkuovku7bnmoTog73lipvjgIJcclxuICogQGVuXHJcbiAqIE9iamVjdHMgdGhvc2UgaW1wbGVtZW50IHRoaXMgaW50ZXJmYWNlIGhhdmUgZXNzZW50aWFsbHkgdGhlIGNhcGFiaWxpdHkgdG8gcHJvY2VzcyBldmVudHMuXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIElFdmVudGlmaWVkIHtcclxuICAgIC8qKlxyXG4gICAgICogQHpoIOajgOafpeaMh+WumuS6i+S7tuaYr+WQpuW3suazqOWGjOWbnuiwg+OAglxyXG4gICAgICogQGVuIENoZWNrcyB3aGV0aGVyIHRoZXJlIGlzIGNvcnJlc3BvbmQgZXZlbnQgbGlzdGVuZXIgcmVnaXN0ZXJlZCBvbiB0aGUgZ2l2ZW4gZXZlbnQuXHJcbiAgICAgKiBAcGFyYW0gdHlwZSAtIEV2ZW50IHR5cGUuXHJcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB3aGVuIGV2ZW50IHRyaWdnZXJlZC5cclxuICAgICAqIEBwYXJhbSB0YXJnZXQgLSBDYWxsYmFjayBjYWxsZWUuXHJcbiAgICAgKi9cclxuICAgIGhhc0V2ZW50TGlzdGVuZXIgKHR5cGU6IHN0cmluZywgY2FsbGJhY2s/OiBGdW5jdGlvbiwgdGFyZ2V0Pzogb2JqZWN0KTogYm9vbGVhbjtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEBlblxyXG4gICAgICogUmVnaXN0ZXIgYW4gY2FsbGJhY2sgb2YgYSBzcGVjaWZpYyBldmVudCB0eXBlIG9uIHRoZSBFdmVudFRhcmdldC5cclxuICAgICAqIFRoaXMgdHlwZSBvZiBldmVudCBzaG91bGQgYmUgdHJpZ2dlcmVkIHZpYSBgZW1pdGAuXHJcbiAgICAgKiBAemhcclxuICAgICAqIOazqOWGjOS6i+S7tuebruagh+eahOeJueWumuS6i+S7tuexu+Wei+Wbnuiwg+OAgui/meenjeexu+Wei+eahOS6i+S7tuW6lOivpeiiqyBgZW1pdGAg6Kem5Y+R44CCXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHR5cGUgLSBBIHN0cmluZyByZXByZXNlbnRpbmcgdGhlIGV2ZW50IHR5cGUgdG8gbGlzdGVuIGZvci5cclxuICAgICAqIEBwYXJhbSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayB0aGF0IHdpbGwgYmUgaW52b2tlZCB3aGVuIHRoZSBldmVudCBpcyBkaXNwYXRjaGVkLlxyXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBUaGUgY2FsbGJhY2sgaXMgaWdub3JlZCBpZiBpdCBpcyBhIGR1cGxpY2F0ZSAodGhlIGNhbGxiYWNrcyBhcmUgdW5pcXVlKS5cclxuICAgICAqIEBwYXJhbSB0aGlzQXJnIC0gVGhlIHRhcmdldCAodGhpcyBvYmplY3QpIHRvIGludm9rZSB0aGUgY2FsbGJhY2ssIGNhbiBiZSBudWxsXHJcbiAgICAgKiBAcmV0dXJuIC0gSnVzdCByZXR1cm5zIHRoZSBpbmNvbWluZyBjYWxsYmFjayBzbyB5b3UgY2FuIHNhdmUgdGhlIGFub255bW91cyBmdW5jdGlvbiBlYXNpZXIuXHJcbiAgICAgKiBAZXhhbXBsZVxyXG4gICAgICogaW1wb3J0IHsgbG9nIH0gZnJvbSAnY2MnO1xyXG4gICAgICogZXZlbnRUYXJnZXQub24oJ2ZpcmUnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgKiAgICAgbG9nKFwiZmlyZSBpbiB0aGUgaG9sZVwiKTtcclxuICAgICAqIH0sIG5vZGUpO1xyXG4gICAgICovXHJcbiAgICBvbjxURnVuY3Rpb24gZXh0ZW5kcyBGdW5jdGlvbj4gKHR5cGU6IEV2ZW50VHlwZSwgY2FsbGJhY2s6IFRGdW5jdGlvbiwgdGhpc0FyZz86IGFueSwgb25jZT86IGJvb2xlYW4pOiB0eXBlb2YgY2FsbGJhY2s7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAZW5cclxuICAgICAqIFJlZ2lzdGVyIGFuIGNhbGxiYWNrIG9mIGEgc3BlY2lmaWMgZXZlbnQgdHlwZSBvbiB0aGUgRXZlbnRUYXJnZXQsXHJcbiAgICAgKiB0aGUgY2FsbGJhY2sgd2lsbCByZW1vdmUgaXRzZWxmIGFmdGVyIHRoZSBmaXJzdCB0aW1lIGl0IGlzIHRyaWdnZXJlZC5cclxuICAgICAqIEB6aFxyXG4gICAgICog5rOo5YaM5LqL5Lu255uu5qCH55qE54m55a6a5LqL5Lu257G75Z6L5Zue6LCD77yM5Zue6LCD5Lya5Zyo56ys5LiA5pe26Ze06KKr6Kem5Y+R5ZCO5Yig6Zmk6Ieq6Lqr44CCXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHR5cGUgLSBBIHN0cmluZyByZXByZXNlbnRpbmcgdGhlIGV2ZW50IHR5cGUgdG8gbGlzdGVuIGZvci5cclxuICAgICAqIEBwYXJhbSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayB0aGF0IHdpbGwgYmUgaW52b2tlZCB3aGVuIHRoZSBldmVudCBpcyBkaXNwYXRjaGVkLlxyXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBUaGUgY2FsbGJhY2sgaXMgaWdub3JlZCBpZiBpdCBpcyBhIGR1cGxpY2F0ZSAodGhlIGNhbGxiYWNrcyBhcmUgdW5pcXVlKS5cclxuICAgICAqIEBwYXJhbSB0YXJnZXQgLSBUaGUgdGFyZ2V0ICh0aGlzIG9iamVjdCkgdG8gaW52b2tlIHRoZSBjYWxsYmFjaywgY2FuIGJlIG51bGxcclxuICAgICAqIEBleGFtcGxlXHJcbiAgICAgKiBpbXBvcnQgeyBsb2cgfSBmcm9tICdjYyc7XHJcbiAgICAgKiBldmVudFRhcmdldC5vbmNlKCdmaXJlJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICogICAgIGxvZyhcInRoaXMgaXMgdGhlIGNhbGxiYWNrIGFuZCB3aWxsIGJlIGludm9rZWQgb25seSBvbmNlXCIpO1xyXG4gICAgICogfSwgbm9kZSk7XHJcbiAgICAgKi9cclxuICAgIG9uY2U8VEZ1bmN0aW9uIGV4dGVuZHMgRnVuY3Rpb24+ICh0eXBlOiBFdmVudFR5cGUsIGNhbGxiYWNrOiBURnVuY3Rpb24sIHRoaXNBcmc/OiBhbnkpOiB0eXBlb2YgY2FsbGJhY2s7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAZW5cclxuICAgICAqIFJlbW92ZXMgdGhlIGxpc3RlbmVycyBwcmV2aW91c2x5IHJlZ2lzdGVyZWQgd2l0aCB0aGUgc2FtZSB0eXBlLCBjYWxsYmFjaywgdGFyZ2V0IGFuZCBvciB1c2VDYXB0dXJlLFxyXG4gICAgICogaWYgb25seSB0eXBlIGlzIHBhc3NlZCBhcyBwYXJhbWV0ZXIsIGFsbCBsaXN0ZW5lcnMgcmVnaXN0ZXJlZCB3aXRoIHRoYXQgdHlwZSB3aWxsIGJlIHJlbW92ZWQuXHJcbiAgICAgKiBAemhcclxuICAgICAqIOWIoOmZpOS5i+WJjeeUqOWQjOexu+Wei++8jOWbnuiwg++8jOebruagh+aIliB1c2VDYXB0dXJlIOazqOWGjOeahOS6i+S7tuebkeWQrOWZqO+8jOWmguaenOWPquS8oOmAkiB0eXBl77yM5bCG5Lya5Yig6ZmkIHR5cGUg57G75Z6L55qE5omA5pyJ5LqL5Lu255uR5ZCs5Zmo44CCXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHR5cGUgLSBBIHN0cmluZyByZXByZXNlbnRpbmcgdGhlIGV2ZW50IHR5cGUgYmVpbmcgcmVtb3ZlZC5cclxuICAgICAqIEBwYXJhbSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayB0byByZW1vdmUuXHJcbiAgICAgKiBAcGFyYW0gdGFyZ2V0IC0gVGhlIHRhcmdldCAodGhpcyBvYmplY3QpIHRvIGludm9rZSB0aGUgY2FsbGJhY2ssIGlmIGl0J3Mgbm90IGdpdmVuLCBvbmx5IGNhbGxiYWNrIHdpdGhvdXQgdGFyZ2V0IHdpbGwgYmUgcmVtb3ZlZFxyXG4gICAgICogQGV4YW1wbGVcclxuICAgICAqIGltcG9ydCB7IGxvZyB9IGZyb20gJ2NjJztcclxuICAgICAqIC8vIHJlZ2lzdGVyIGZpcmUgZXZlbnRMaXN0ZW5lclxyXG4gICAgICogdmFyIGNhbGxiYWNrID0gZXZlbnRUYXJnZXQub24oJ2ZpcmUnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgKiAgICAgbG9nKFwiZmlyZSBpbiB0aGUgaG9sZVwiKTtcclxuICAgICAqIH0sIHRhcmdldCk7XHJcbiAgICAgKiAvLyByZW1vdmUgZmlyZSBldmVudCBsaXN0ZW5lclxyXG4gICAgICogZXZlbnRUYXJnZXQub2ZmKCdmaXJlJywgY2FsbGJhY2ssIHRhcmdldCk7XHJcbiAgICAgKiAvLyByZW1vdmUgYWxsIGZpcmUgZXZlbnQgbGlzdGVuZXJzXHJcbiAgICAgKiBldmVudFRhcmdldC5vZmYoJ2ZpcmUnKTtcclxuICAgICAqL1xyXG4gICAgb2ZmPFRGdW5jdGlvbiBleHRlbmRzIEZ1bmN0aW9uPiAodHlwZTogRXZlbnRUeXBlLCBjYWxsYmFjaz86IFRGdW5jdGlvbiwgdGhpc0FyZz86IGFueSk6IHZvaWQ7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAZW4gUmVtb3ZlcyBhbGwgY2FsbGJhY2tzIHByZXZpb3VzbHkgcmVnaXN0ZXJlZCB3aXRoIHRoZSBzYW1lIHRhcmdldCAocGFzc2VkIGFzIHBhcmFtZXRlcikuXHJcbiAgICAgKiBUaGlzIGlzIG5vdCBmb3IgcmVtb3ZpbmcgYWxsIGxpc3RlbmVycyBpbiB0aGUgY3VycmVudCBldmVudCB0YXJnZXQsXHJcbiAgICAgKiBhbmQgdGhpcyBpcyBub3QgZm9yIHJlbW92aW5nIGFsbCBsaXN0ZW5lcnMgdGhlIHRhcmdldCBwYXJhbWV0ZXIgaGF2ZSByZWdpc3RlcmVkLlxyXG4gICAgICogSXQncyBvbmx5IGZvciByZW1vdmluZyBhbGwgbGlzdGVuZXJzIChjYWxsYmFjayBhbmQgdGFyZ2V0IGNvdXBsZSkgcmVnaXN0ZXJlZCBvbiB0aGUgY3VycmVudCBldmVudCB0YXJnZXQgYnkgdGhlIHRhcmdldCBwYXJhbWV0ZXIuXHJcbiAgICAgKiBAemgg5Zyo5b2T5YmNIEV2ZW50VGFyZ2V0IOS4iuWIoOmZpOaMh+Wumuebruagh++8iHRhcmdldCDlj4LmlbDvvInms6jlhoznmoTmiYDmnInkuovku7bnm5HlkKzlmajjgIJcclxuICAgICAqIOi/meS4quWHveaVsOaXoOazleWIoOmZpOW9k+WJjSBFdmVudFRhcmdldCDnmoTmiYDmnInkuovku7bnm5HlkKzlmajvvIzkuZ/ml6Dms5XliKDpmaQgdGFyZ2V0IOWPguaVsOaJgOazqOWGjOeahOaJgOacieS6i+S7tuebkeWQrOWZqOOAglxyXG4gICAgICog6L+Z5Liq5Ye95pWw5Y+q6IO95Yig6ZmkIHRhcmdldCDlj4LmlbDlnKjlvZPliY0gRXZlbnRUYXJnZXQg5LiK5rOo5YaM55qE5omA5pyJ5LqL5Lu255uR5ZCs5Zmo44CCXHJcbiAgICAgKiBAcGFyYW0gdHlwZU9yVGFyZ2V0IC0gVGhlIHRhcmdldCB0byBiZSBzZWFyY2hlZCBmb3IgYWxsIHJlbGF0ZWQgbGlzdGVuZXJzXHJcbiAgICAgKi9cclxuICAgIHRhcmdldE9mZiAodHlwZU9yVGFyZ2V0OiBzdHJpbmcgfCBvYmplY3QpOiB2b2lkO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHpoIOenu+mZpOWcqOeJueWumuS6i+S7tuexu+Wei+S4reazqOWGjOeahOaJgOacieWbnuiwg+aIluWcqOafkOS4quebruagh+S4reazqOWGjOeahOaJgOacieWbnuiwg+OAglxyXG4gICAgICogQGVuIFJlbW92ZXMgYWxsIGNhbGxiYWNrcyByZWdpc3RlcmVkIGluIGEgY2VydGFpbiBldmVudCB0eXBlIG9yIGFsbCBjYWxsYmFja3MgcmVnaXN0ZXJlZCB3aXRoIGEgY2VydGFpbiB0YXJnZXRcclxuICAgICAqIEBwYXJhbSB0eXBlT3JUYXJnZXQgLSBUaGUgZXZlbnQgdHlwZSBvciB0YXJnZXQgd2l0aCB3aGljaCB0aGUgbGlzdGVuZXJzIHdpbGwgYmUgcmVtb3ZlZFxyXG4gICAgICovXHJcbiAgICByZW1vdmVBbGwgKHR5cGVPclRhcmdldDogc3RyaW5nIHwgb2JqZWN0KTogdm9pZDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEB6aCDmtL7lj5HkuIDkuKrmjIflrprkuovku7bvvIzlubbkvKDpgJLpnIDopoHnmoTlj4LmlbBcclxuICAgICAqIEBlbiBUcmlnZ2VyIGFuIGV2ZW50IGRpcmVjdGx5IHdpdGggdGhlIGV2ZW50IG5hbWUgYW5kIG5lY2Vzc2FyeSBhcmd1bWVudHMuXHJcbiAgICAgKiBAcGFyYW0gdHlwZSAtIGV2ZW50IHR5cGVcclxuICAgICAqIEBwYXJhbSBhcmdzIC0gQXJndW1lbnRzIHdoZW4gdGhlIGV2ZW50IHRyaWdnZXJlZFxyXG4gICAgICovXHJcbiAgICBlbWl0ICh0eXBlOiBFdmVudFR5cGUsIGFyZzA/OiBhbnksIGFyZzE/OiBhbnksIGFyZzI/OiBhbnksIGFyZzM/OiBhbnksIGFyZzQ/OiBhbnkpOiB2b2lkO1xyXG59XHJcblxyXG4vKipcclxuICogQGVuIEdlbmVyYXRlIGEgbmV3IGNsYXNzIGZyb20gdGhlIGdpdmVuIGJhc2UgY2xhc3MsIGFmdGVyIHBvbHlmaWxsIGFsbCBmdW5jdGlvbmFsaXRpZXMgaW4gW1tJRXZlbnRpZmllZF1dIGFzIGlmIGl0J3MgZXh0ZW5kZWQgZnJvbSBbW0V2ZW50VGFyZ2V0XV1cclxuICogQHpoIOeUn+aIkOS4gOS4quexu++8jOivpeexu+e7p+aJv+iHquaMh+WumueahOWfuuexu++8jOW5tuS7peWSjCBbW0V2ZW50VGFyZ2V0XV0g562J5ZCM55qE5pa55byP5a6e546w5LqGIFtbSUV2ZW50aWZpZWRdXSDnmoTmiYDmnInmjqXlj6PjgIJcclxuICogQHBhcmFtIGJhc2UgVGhlIGJhc2UgY2xhc3NcclxuICogQGV4YW1wbGVcclxuICogYGBgdHNcclxuICogY2xhc3MgQmFzZSB7IHNheSgpIHsgY29uc29sZS5sb2coJ0hlbGxvIScpOyB9IH1cclxuICogY2xhc3MgTXlDbGFzcyBleHRlbmRzIEV2ZW50aWZ5KEJhc2UpIHsgfVxyXG4gKiBmdW5jdGlvbiAobzogTXlDbGFzcykge1xyXG4gKiAgICAgby5zYXkoKTsgLy8gT2s6IEV4dGVuZCBmcm9tIGBCYXNlYFxyXG4gKiAgICAgby5lbWl0KCdzaW5nJywgJ1RoZSBnaG9zdCcpOyAvLyBPazogYE15Q2xhc3NgIGltcGxlbWVudHMgSUV2ZW50aWZpZWRcclxuICogfVxyXG4gKiBgYGBcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBFdmVudGlmeTxUQmFzZT4gKGJhc2U6IENvbnN0cnVjdG9yPFRCYXNlPik6IENvbnN0cnVjdG9yPFRCYXNlICYgSUV2ZW50aWZpZWQ+IHtcclxuICAgIGNsYXNzIEV2ZW50aWZpZWQgZXh0ZW5kcyAoYmFzZSBhcyB1bmtub3duIGFzIGFueSkge1xyXG4gICAgICAgIHByaXZhdGUgX2NhbGxiYWNrVGFibGUgPSBjcmVhdGVNYXAodHJ1ZSk7XHJcblxyXG4gICAgICAgIHB1YmxpYyBvbmNlPENhbGxiYWNrIGV4dGVuZHMgRnVuY3Rpb24+ICh0eXBlOiBFdmVudFR5cGUsIGNhbGxiYWNrOiBDYWxsYmFjaywgdGFyZ2V0Pzogb2JqZWN0KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm9uKHR5cGUsIGNhbGxiYWNrLCB0YXJnZXQsIHRydWUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHRhcmdldE9mZiAodHlwZU9yVGFyZ2V0OiBzdHJpbmcgfCBvYmplY3QpIHtcclxuICAgICAgICAgICAgdGhpcy5yZW1vdmVBbGwodHlwZU9yVGFyZ2V0KTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIC8vIE1peGluIHdpdGggYENhbGxiYWNrc0ludm9rZXJzYCdzIHByb3RvdHlwZVxyXG4gICAgY29uc3QgY2FsbGJhY2tzSW52b2tlclByb3RvdHlwZSA9IENhbGxiYWNrc0ludm9rZXIucHJvdG90eXBlO1xyXG4gICAgY29uc3QgcHJvcGVydHlLZXlzOiAoc3RyaW5nIHwgc3ltYm9sKVtdID1cclxuICAgICAgICAoT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoY2FsbGJhY2tzSW52b2tlclByb3RvdHlwZSkgYXMgKHN0cmluZyB8IHN5bWJvbClbXSkuY29uY2F0KFxyXG4gICAgICAgICAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKGNhbGxiYWNrc0ludm9rZXJQcm90b3R5cGUpKTtcclxuICAgIGZvciAobGV0IGlQcm9wZXJ0eUtleSA9IDA7IGlQcm9wZXJ0eUtleSA8IHByb3BlcnR5S2V5cy5sZW5ndGg7ICsraVByb3BlcnR5S2V5KSB7XHJcbiAgICAgICAgY29uc3QgcHJvcGVydHlLZXkgPSBwcm9wZXJ0eUtleXNbaVByb3BlcnR5S2V5XTtcclxuICAgICAgICBpZiAoIShwcm9wZXJ0eUtleSBpbiBFdmVudGlmaWVkLnByb3RvdHlwZSkpIHtcclxuICAgICAgICAgICAgY29uc3QgcHJvcGVydHlEZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihjYWxsYmFja3NJbnZva2VyUHJvdG90eXBlLCBwcm9wZXJ0eUtleSk7XHJcbiAgICAgICAgICAgIGlmIChwcm9wZXJ0eURlc2NyaXB0b3IpIHtcclxuICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShFdmVudGlmaWVkLnByb3RvdHlwZSwgcHJvcGVydHlLZXksIHByb3BlcnR5RGVzY3JpcHRvcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIEV2ZW50aWZpZWQgYXMgdW5rbm93biBhcyBhbnk7XHJcbn0iXX0=