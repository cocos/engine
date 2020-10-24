(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(["exports", "../math/index.js"], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports, require("../math/index.js"));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports, global.index);
    global.cylinder = mod.exports;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : this, function (_exports, _index) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = cylinder;

  /**
   * @category 3d/primitive
   */
  var temp1 = new _index.Vec3(0, 0, 0);
  var temp2 = new _index.Vec3(0, 0, 0);
  /**
   * @en
   * Generate a cylinder with radiusTop radiusBottom 0.5, height 2 and centered at origin,
   * but may be repositioned through the `center` option.
   * @zh
   * 生成一个圆柱。
   * @param radiusTop 顶部半径。
   * @param radiusBottom 底部半径。
   * @param opts 圆柱参数选项。
   */

  function cylinder() {
    var radiusTop = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0.5;
    var radiusBottom = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0.5;
    var height = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 2;
    var opts = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
    var halfHeight = height * 0.5;
    var radialSegments = opts.radialSegments || 32;
    var heightSegments = opts.heightSegments || 1;
    var capped = opts.capped !== undefined ? opts.capped : true;
    var arc = opts.arc || 2.0 * Math.PI;
    var cntCap = 0;

    if (!capped) {
      if (radiusTop > 0) {
        cntCap++;
      }

      if (radiusBottom > 0) {
        cntCap++;
      }
    } // calculate vertex count


    var vertCount = (radialSegments + 1) * (heightSegments + 1);

    if (capped) {
      vertCount += (radialSegments + 1) * cntCap + radialSegments * cntCap;
    } // calculate index count


    var indexCount = radialSegments * heightSegments * 2 * 3;

    if (capped) {
      indexCount += radialSegments * cntCap * 3;
    }

    var indices = new Array(indexCount);
    var positions = new Array(vertCount * 3);
    var normals = new Array(vertCount * 3);
    var uvs = new Array(vertCount * 2);
    var maxRadius = Math.max(radiusTop, radiusBottom);
    var minPos = new _index.Vec3(-maxRadius, -halfHeight, -maxRadius);
    var maxPos = new _index.Vec3(maxRadius, halfHeight, maxRadius);
    var boundingRadius = Math.sqrt(maxRadius * maxRadius + halfHeight * halfHeight);
    var index = 0;
    var indexOffset = 0;
    generateTorso();

    if (capped) {
      if (radiusBottom > 0) {
        generateCap(false);
      }

      if (radiusTop > 0) {
        generateCap(true);
      }
    }

    return {
      positions: positions,
      normals: normals,
      uvs: uvs,
      indices: indices,
      minPos: minPos,
      maxPos: maxPos,
      boundingRadius: boundingRadius
    }; // =======================
    // internal fucntions
    // =======================

    function generateTorso() {
      var indexArray = []; // this will be used to calculate the normal

      var r = radiusTop - radiusBottom;
      var slope = r * r / height * Math.sign(r); // generate positions, normals and uvs

      for (var y = 0; y <= heightSegments; y++) {
        var indexRow = [];
        var v = y / heightSegments; // calculate the radius of the current row

        var radius = v * r + radiusBottom;

        for (var x = 0; x <= radialSegments; ++x) {
          var u = x / radialSegments;
          var theta = u * arc;
          var sinTheta = Math.sin(theta);
          var cosTheta = Math.cos(theta); // vertex

          positions[3 * index] = radius * sinTheta;
          positions[3 * index + 1] = v * height - halfHeight;
          positions[3 * index + 2] = radius * cosTheta; // normal

          _index.Vec3.normalize(temp1, _index.Vec3.set(temp2, sinTheta, -slope, cosTheta));

          normals[3 * index] = temp1.x;
          normals[3 * index + 1] = temp1.y;
          normals[3 * index + 2] = temp1.z; // uv

          uvs[2 * index] = (1 - u) * 2 % 1;
          uvs[2 * index + 1] = v; // save index of vertex in respective row

          indexRow.push(index); // increase index

          ++index;
        } // now save positions of the row in our index array


        indexArray.push(indexRow);
      } // generate indices


      for (var _y = 0; _y < heightSegments; ++_y) {
        for (var _x = 0; _x < radialSegments; ++_x) {
          // we use the index array to access the correct indices
          var i1 = indexArray[_y][_x];
          var i2 = indexArray[_y + 1][_x];
          var i3 = indexArray[_y + 1][_x + 1];
          var i4 = indexArray[_y][_x + 1]; // face one

          indices[indexOffset] = i1;
          ++indexOffset;
          indices[indexOffset] = i4;
          ++indexOffset;
          indices[indexOffset] = i2;
          ++indexOffset; // face two

          indices[indexOffset] = i4;
          ++indexOffset;
          indices[indexOffset] = i3;
          ++indexOffset;
          indices[indexOffset] = i2;
          ++indexOffset;
        }
      }
    }

    function generateCap(top) {
      var radius = top ? radiusTop : radiusBottom;
      var sign = top ? 1 : -1; // save the index of the first center vertex

      var centerIndexStart = index; // first we generate the center vertex data of the cap.
      // because the geometry needs one set of uvs per face,
      // we must generate a center vertex per face/segment

      for (var x = 1; x <= radialSegments; ++x) {
        // vertex
        positions[3 * index] = 0;
        positions[3 * index + 1] = halfHeight * sign;
        positions[3 * index + 2] = 0; // normal

        normals[3 * index] = 0;
        normals[3 * index + 1] = sign;
        normals[3 * index + 2] = 0; // uv

        uvs[2 * index] = 0.5;
        uvs[2 * index + 1] = 0.5; // increase index

        ++index;
      } // save the index of the last center vertex


      var centerIndexEnd = index; // now we generate the surrounding positions, normals and uvs

      for (var _x2 = 0; _x2 <= radialSegments; ++_x2) {
        var u = _x2 / radialSegments;
        var theta = u * arc;
        var cosTheta = Math.cos(theta);
        var sinTheta = Math.sin(theta); // vertex

        positions[3 * index] = radius * sinTheta;
        positions[3 * index + 1] = halfHeight * sign;
        positions[3 * index + 2] = radius * cosTheta; // normal

        normals[3 * index] = 0;
        normals[3 * index + 1] = sign;
        normals[3 * index + 2] = 0; // uv

        uvs[2 * index] = 0.5 - sinTheta * 0.5 * sign;
        uvs[2 * index + 1] = 0.5 + cosTheta * 0.5; // increase index

        ++index;
      } // generate indices


      for (var _x3 = 0; _x3 < radialSegments; ++_x3) {
        var c = centerIndexStart + _x3;
        var i = centerIndexEnd + _x3;

        if (top) {
          // face top
          indices[indexOffset] = i + 1;
          ++indexOffset;
          indices[indexOffset] = c;
          ++indexOffset;
          indices[indexOffset] = i;
          ++indexOffset;
        } else {
          // face bottom
          indices[indexOffset] = c;
          ++indexOffset;
          indices[indexOffset] = i + 1;
          ++indexOffset;
          indices[indexOffset] = i;
          ++indexOffset;
        }
      }
    }
  }
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImU6L2QwMDQ1MjUyMC9HaXRodWIvZW5naW5lL2NvY29zL2NvcmUvcHJpbWl0aXZlL2N5bGluZGVyLnRzIl0sIm5hbWVzIjpbInRlbXAxIiwiVmVjMyIsInRlbXAyIiwiY3lsaW5kZXIiLCJyYWRpdXNUb3AiLCJyYWRpdXNCb3R0b20iLCJoZWlnaHQiLCJvcHRzIiwiaGFsZkhlaWdodCIsInJhZGlhbFNlZ21lbnRzIiwiaGVpZ2h0U2VnbWVudHMiLCJjYXBwZWQiLCJ1bmRlZmluZWQiLCJhcmMiLCJNYXRoIiwiUEkiLCJjbnRDYXAiLCJ2ZXJ0Q291bnQiLCJpbmRleENvdW50IiwiaW5kaWNlcyIsIkFycmF5IiwicG9zaXRpb25zIiwibm9ybWFscyIsInV2cyIsIm1heFJhZGl1cyIsIm1heCIsIm1pblBvcyIsIm1heFBvcyIsImJvdW5kaW5nUmFkaXVzIiwic3FydCIsImluZGV4IiwiaW5kZXhPZmZzZXQiLCJnZW5lcmF0ZVRvcnNvIiwiZ2VuZXJhdGVDYXAiLCJpbmRleEFycmF5IiwiciIsInNsb3BlIiwic2lnbiIsInkiLCJpbmRleFJvdyIsInYiLCJyYWRpdXMiLCJ4IiwidSIsInRoZXRhIiwic2luVGhldGEiLCJzaW4iLCJjb3NUaGV0YSIsImNvcyIsIm5vcm1hbGl6ZSIsInNldCIsInoiLCJwdXNoIiwiaTEiLCJpMiIsImkzIiwiaTQiLCJ0b3AiLCJjZW50ZXJJbmRleFN0YXJ0IiwiY2VudGVySW5kZXhFbmQiLCJjIiwiaSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTs7O0FBb0JBLE1BQU1BLEtBQUssR0FBRyxJQUFJQyxXQUFKLENBQVMsQ0FBVCxFQUFZLENBQVosRUFBZSxDQUFmLENBQWQ7QUFDQSxNQUFNQyxLQUFLLEdBQUcsSUFBSUQsV0FBSixDQUFTLENBQVQsRUFBWSxDQUFaLEVBQWUsQ0FBZixDQUFkO0FBRUE7Ozs7Ozs7Ozs7O0FBVWUsV0FBU0UsUUFBVCxHQUE4SDtBQUFBLFFBQTNHQyxTQUEyRyx1RUFBL0YsR0FB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cEIsRUFBb0MsRUFBRWlDLEdBQXRDLEVBQXlDO0FBQ3ZDLFlBQU1rQixDQUFDLEdBQUdGLGdCQUFnQixHQUFHaEIsR0FBN0I7QUFDQSxZQUFNbUIsQ0FBQyxHQUFHRixjQUFjLEdBQUdqQixHQUEzQjs7QUFFQSxZQUFJZSxHQUFKLEVBQVM7QUFDUDtBQUNBdEMsVUFBQUEsT0FBTyxDQUFDWSxXQUFELENBQVAsR0FBdUI4QixDQUFDLEdBQUcsQ0FBM0I7QUFBOEIsWUFBRTlCLFdBQUY7QUFDOUJaLFVBQUFBLE9BQU8sQ0FBQ1ksV0FBRCxDQUFQLEdBQXVCNkIsQ0FBdkI7QUFBMEIsWUFBRTdCLFdBQUY7QUFDMUJaLFVBQUFBLE9BQU8sQ0FBQ1ksV0FBRCxDQUFQLEdBQXVCOEIsQ0FBdkI7QUFBMEIsWUFBRTlCLFdBQUY7QUFDM0IsU0FMRCxNQUtPO0FBQ0w7QUFDQVosVUFBQUEsT0FBTyxDQUFDWSxXQUFELENBQVAsR0FBdUI2QixDQUF2QjtBQUEwQixZQUFFN0IsV0FBRjtBQUMxQlosVUFBQUEsT0FBTyxDQUFDWSxXQUFELENBQVAsR0FBdUI4QixDQUFDLEdBQUcsQ0FBM0I7QUFBOEIsWUFBRTlCLFdBQUY7QUFDOUJaLFVBQUFBLE9BQU8sQ0FBQ1ksV0FBRCxDQUFQLEdBQXVCOEIsQ0FBdkI7QUFBMEIsWUFBRTlCLFdBQUY7QUFDM0I7QUFDRjtBQUNGO0FBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQGNhdGVnb3J5IDNkL3ByaW1pdGl2ZVxyXG4gKi9cclxuXHJcbmltcG9ydCB7IFZlYzMgfSBmcm9tICcuLi9tYXRoJztcclxuaW1wb3J0IHsgSUdlb21ldHJ5LCBJR2VvbWV0cnlPcHRpb25zIH0gZnJvbSAnLi9kZWZpbmUnO1xyXG5cclxuLyoqXHJcbiAqIEBlblxyXG4gKiBUaGUgZGVmaW5pdGlvbiBvZiB0aGUgcGFyYW1ldGVyIGZvciBidWlsZGluZyBhIGN5bGluZGVyLlxyXG4gKiBAemhcclxuICog5ZyG5p+x5Y+C5pWw6YCJ6aG544CCXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIElDeWxpbmRlck9wdGlvbnMgZXh0ZW5kcyBJR2VvbWV0cnlPcHRpb25zIHtcclxuICByYWRpYWxTZWdtZW50czogbnVtYmVyO1xyXG4gIGhlaWdodFNlZ21lbnRzOiBudW1iZXI7XHJcbiAgY2FwcGVkOiBib29sZWFuO1xyXG4gIGFyYzogbnVtYmVyO1xyXG59XHJcblxyXG5jb25zdCB0ZW1wMSA9IG5ldyBWZWMzKDAsIDAsIDApO1xyXG5jb25zdCB0ZW1wMiA9IG5ldyBWZWMzKDAsIDAsIDApO1xyXG5cclxuLyoqXHJcbiAqIEBlblxyXG4gKiBHZW5lcmF0ZSBhIGN5bGluZGVyIHdpdGggcmFkaXVzVG9wIHJhZGl1c0JvdHRvbSAwLjUsIGhlaWdodCAyIGFuZCBjZW50ZXJlZCBhdCBvcmlnaW4sXHJcbiAqIGJ1dCBtYXkgYmUgcmVwb3NpdGlvbmVkIHRocm91Z2ggdGhlIGBjZW50ZXJgIG9wdGlvbi5cclxuICogQHpoXHJcbiAqIOeUn+aIkOS4gOS4quWchuafseOAglxyXG4gKiBAcGFyYW0gcmFkaXVzVG9wIOmhtumDqOWNiuW+hOOAglxyXG4gKiBAcGFyYW0gcmFkaXVzQm90dG9tIOW6lemDqOWNiuW+hOOAglxyXG4gKiBAcGFyYW0gb3B0cyDlnIbmn7Hlj4LmlbDpgInpobnjgIJcclxuICovXHJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGN5bGluZGVyIChyYWRpdXNUb3AgPSAwLjUsIHJhZGl1c0JvdHRvbSA9IDAuNSwgaGVpZ2h0ID0gMiwgb3B0czogUmVjdXJzaXZlUGFydGlhbDxJQ3lsaW5kZXJPcHRpb25zPiA9IHt9KTogSUdlb21ldHJ5IHtcclxuICBjb25zdCBoYWxmSGVpZ2h0ID0gaGVpZ2h0ICogMC41O1xyXG4gIGNvbnN0IHJhZGlhbFNlZ21lbnRzID0gb3B0cy5yYWRpYWxTZWdtZW50cyB8fCAzMjtcclxuICBjb25zdCBoZWlnaHRTZWdtZW50cyA9IG9wdHMuaGVpZ2h0U2VnbWVudHMgfHwgMTtcclxuICBjb25zdCBjYXBwZWQgPSBvcHRzLmNhcHBlZCAhPT0gdW5kZWZpbmVkID8gb3B0cy5jYXBwZWQgOiB0cnVlO1xyXG4gIGNvbnN0IGFyYyA9IG9wdHMuYXJjIHx8IDIuMCAqIE1hdGguUEk7XHJcblxyXG4gIGxldCBjbnRDYXAgPSAwO1xyXG4gIGlmICghY2FwcGVkKSB7XHJcbiAgICBpZiAocmFkaXVzVG9wID4gMCkge1xyXG4gICAgICBjbnRDYXArKztcclxuICAgIH1cclxuXHJcbiAgICBpZiAocmFkaXVzQm90dG9tID4gMCkge1xyXG4gICAgICBjbnRDYXArKztcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIGNhbGN1bGF0ZSB2ZXJ0ZXggY291bnRcclxuICBsZXQgdmVydENvdW50ID0gKHJhZGlhbFNlZ21lbnRzICsgMSkgKiAoaGVpZ2h0U2VnbWVudHMgKyAxKTtcclxuICBpZiAoY2FwcGVkKSB7XHJcbiAgICB2ZXJ0Q291bnQgKz0gKChyYWRpYWxTZWdtZW50cyArIDEpICogY250Q2FwKSArIChyYWRpYWxTZWdtZW50cyAqIGNudENhcCk7XHJcbiAgfVxyXG5cclxuICAvLyBjYWxjdWxhdGUgaW5kZXggY291bnRcclxuICBsZXQgaW5kZXhDb3VudCA9IHJhZGlhbFNlZ21lbnRzICogaGVpZ2h0U2VnbWVudHMgKiAyICogMztcclxuICBpZiAoY2FwcGVkKSB7XHJcbiAgICBpbmRleENvdW50ICs9IHJhZGlhbFNlZ21lbnRzICogY250Q2FwICogMztcclxuICB9XHJcblxyXG4gIGNvbnN0IGluZGljZXMgPSBuZXcgQXJyYXkoaW5kZXhDb3VudCk7XHJcbiAgY29uc3QgcG9zaXRpb25zID0gbmV3IEFycmF5KHZlcnRDb3VudCAqIDMpO1xyXG4gIGNvbnN0IG5vcm1hbHMgPSBuZXcgQXJyYXkodmVydENvdW50ICogMyk7XHJcbiAgY29uc3QgdXZzID0gbmV3IEFycmF5KHZlcnRDb3VudCAqIDIpO1xyXG4gIGNvbnN0IG1heFJhZGl1cyA9IE1hdGgubWF4KHJhZGl1c1RvcCwgcmFkaXVzQm90dG9tKTtcclxuICBjb25zdCBtaW5Qb3MgPSBuZXcgVmVjMygtbWF4UmFkaXVzLCAtaGFsZkhlaWdodCwgLW1heFJhZGl1cyk7XHJcbiAgY29uc3QgbWF4UG9zID0gbmV3IFZlYzMobWF4UmFkaXVzLCBoYWxmSGVpZ2h0LCBtYXhSYWRpdXMpO1xyXG4gIGNvbnN0IGJvdW5kaW5nUmFkaXVzID0gTWF0aC5zcXJ0KG1heFJhZGl1cyAqIG1heFJhZGl1cyArIGhhbGZIZWlnaHQgKiBoYWxmSGVpZ2h0KTtcclxuXHJcbiAgbGV0IGluZGV4ID0gMDtcclxuICBsZXQgaW5kZXhPZmZzZXQgPSAwO1xyXG5cclxuICBnZW5lcmF0ZVRvcnNvKCk7XHJcblxyXG4gIGlmIChjYXBwZWQpIHtcclxuICAgIGlmIChyYWRpdXNCb3R0b20gPiAwKSB7XHJcbiAgICAgIGdlbmVyYXRlQ2FwKGZhbHNlKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAocmFkaXVzVG9wID4gMCkge1xyXG4gICAgICBnZW5lcmF0ZUNhcCh0cnVlKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBwb3NpdGlvbnMsXHJcbiAgICBub3JtYWxzLFxyXG4gICAgdXZzLFxyXG4gICAgaW5kaWNlcyxcclxuICAgIG1pblBvcyxcclxuICAgIG1heFBvcyxcclxuICAgIGJvdW5kaW5nUmFkaXVzLFxyXG4gIH07XHJcblxyXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09XHJcbiAgLy8gaW50ZXJuYWwgZnVjbnRpb25zXHJcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT1cclxuXHJcbiAgZnVuY3Rpb24gZ2VuZXJhdGVUb3JzbyAoKSB7XHJcbiAgICBjb25zdCBpbmRleEFycmF5OiBudW1iZXJbXVtdID0gW107XHJcblxyXG4gICAgLy8gdGhpcyB3aWxsIGJlIHVzZWQgdG8gY2FsY3VsYXRlIHRoZSBub3JtYWxcclxuICAgIGNvbnN0IHIgPSByYWRpdXNUb3AgLSByYWRpdXNCb3R0b207XHJcbiAgICBjb25zdCBzbG9wZSA9IHIgKiByIC8gaGVpZ2h0ICogTWF0aC5zaWduKHIpO1xyXG5cclxuICAgIC8vIGdlbmVyYXRlIHBvc2l0aW9ucywgbm9ybWFscyBhbmQgdXZzXHJcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8PSBoZWlnaHRTZWdtZW50czsgeSsrKSB7XHJcbiAgICAgIGNvbnN0IGluZGV4Um93OiBudW1iZXJbXSA9IFtdO1xyXG4gICAgICBjb25zdCB2ID0geSAvIGhlaWdodFNlZ21lbnRzO1xyXG5cclxuICAgICAgLy8gY2FsY3VsYXRlIHRoZSByYWRpdXMgb2YgdGhlIGN1cnJlbnQgcm93XHJcbiAgICAgIGNvbnN0IHJhZGl1cyA9IHYgKiByICsgcmFkaXVzQm90dG9tO1xyXG5cclxuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPD0gcmFkaWFsU2VnbWVudHM7ICsreCkge1xyXG4gICAgICAgIGNvbnN0IHUgPSB4IC8gcmFkaWFsU2VnbWVudHM7XHJcbiAgICAgICAgY29uc3QgdGhldGEgPSB1ICogYXJjO1xyXG5cclxuICAgICAgICBjb25zdCBzaW5UaGV0YSA9IE1hdGguc2luKHRoZXRhKTtcclxuICAgICAgICBjb25zdCBjb3NUaGV0YSA9IE1hdGguY29zKHRoZXRhKTtcclxuXHJcbiAgICAgICAgLy8gdmVydGV4XHJcbiAgICAgICAgcG9zaXRpb25zWzMgKiBpbmRleF0gPSByYWRpdXMgKiBzaW5UaGV0YTtcclxuICAgICAgICBwb3NpdGlvbnNbMyAqIGluZGV4ICsgMV0gPSB2ICogaGVpZ2h0IC0gaGFsZkhlaWdodDtcclxuICAgICAgICBwb3NpdGlvbnNbMyAqIGluZGV4ICsgMl0gPSByYWRpdXMgKiBjb3NUaGV0YTtcclxuXHJcbiAgICAgICAgLy8gbm9ybWFsXHJcbiAgICAgICAgVmVjMy5ub3JtYWxpemUodGVtcDEsIFZlYzMuc2V0KHRlbXAyLCBzaW5UaGV0YSwgLXNsb3BlLCBjb3NUaGV0YSkpO1xyXG4gICAgICAgIG5vcm1hbHNbMyAqIGluZGV4XSA9IHRlbXAxLng7XHJcbiAgICAgICAgbm9ybWFsc1szICogaW5kZXggKyAxXSA9IHRlbXAxLnk7XHJcbiAgICAgICAgbm9ybWFsc1szICogaW5kZXggKyAyXSA9IHRlbXAxLno7XHJcblxyXG4gICAgICAgIC8vIHV2XHJcbiAgICAgICAgdXZzWzIgKiBpbmRleF0gPSAoMSAtIHUpICogMiAlIDE7XHJcbiAgICAgICAgdXZzWzIgKiBpbmRleCArIDFdID0gdjtcclxuXHJcbiAgICAgICAgLy8gc2F2ZSBpbmRleCBvZiB2ZXJ0ZXggaW4gcmVzcGVjdGl2ZSByb3dcclxuICAgICAgICBpbmRleFJvdy5wdXNoKGluZGV4KTtcclxuXHJcbiAgICAgICAgLy8gaW5jcmVhc2UgaW5kZXhcclxuICAgICAgICArK2luZGV4O1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBub3cgc2F2ZSBwb3NpdGlvbnMgb2YgdGhlIHJvdyBpbiBvdXIgaW5kZXggYXJyYXlcclxuICAgICAgaW5kZXhBcnJheS5wdXNoKGluZGV4Um93KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBnZW5lcmF0ZSBpbmRpY2VzXHJcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGhlaWdodFNlZ21lbnRzOyArK3kpIHtcclxuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCByYWRpYWxTZWdtZW50czsgKyt4KSB7XHJcbiAgICAgICAgLy8gd2UgdXNlIHRoZSBpbmRleCBhcnJheSB0byBhY2Nlc3MgdGhlIGNvcnJlY3QgaW5kaWNlc1xyXG4gICAgICAgIGNvbnN0IGkxID0gaW5kZXhBcnJheVt5XVt4XTtcclxuICAgICAgICBjb25zdCBpMiA9IGluZGV4QXJyYXlbeSArIDFdW3hdO1xyXG4gICAgICAgIGNvbnN0IGkzID0gaW5kZXhBcnJheVt5ICsgMV1beCArIDFdO1xyXG4gICAgICAgIGNvbnN0IGk0ID0gaW5kZXhBcnJheVt5XVt4ICsgMV07XHJcblxyXG4gICAgICAgIC8vIGZhY2Ugb25lXHJcbiAgICAgICAgaW5kaWNlc1tpbmRleE9mZnNldF0gPSBpMTsgKytpbmRleE9mZnNldDtcclxuICAgICAgICBpbmRpY2VzW2luZGV4T2Zmc2V0XSA9IGk0OyArK2luZGV4T2Zmc2V0O1xyXG4gICAgICAgIGluZGljZXNbaW5kZXhPZmZzZXRdID0gaTI7ICsraW5kZXhPZmZzZXQ7XHJcblxyXG4gICAgICAgIC8vIGZhY2UgdHdvXHJcbiAgICAgICAgaW5kaWNlc1tpbmRleE9mZnNldF0gPSBpNDsgKytpbmRleE9mZnNldDtcclxuICAgICAgICBpbmRpY2VzW2luZGV4T2Zmc2V0XSA9IGkzOyArK2luZGV4T2Zmc2V0O1xyXG4gICAgICAgIGluZGljZXNbaW5kZXhPZmZzZXRdID0gaTI7ICsraW5kZXhPZmZzZXQ7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGdlbmVyYXRlQ2FwICh0b3ApIHtcclxuICAgIGNvbnN0IHJhZGl1cyA9IHRvcCA/IHJhZGl1c1RvcCA6IHJhZGl1c0JvdHRvbTtcclxuICAgIGNvbnN0IHNpZ24gPSB0b3AgPyAxIDogLSAxO1xyXG5cclxuICAgIC8vIHNhdmUgdGhlIGluZGV4IG9mIHRoZSBmaXJzdCBjZW50ZXIgdmVydGV4XHJcbiAgICBjb25zdCBjZW50ZXJJbmRleFN0YXJ0ID0gaW5kZXg7XHJcblxyXG4gICAgLy8gZmlyc3Qgd2UgZ2VuZXJhdGUgdGhlIGNlbnRlciB2ZXJ0ZXggZGF0YSBvZiB0aGUgY2FwLlxyXG4gICAgLy8gYmVjYXVzZSB0aGUgZ2VvbWV0cnkgbmVlZHMgb25lIHNldCBvZiB1dnMgcGVyIGZhY2UsXHJcbiAgICAvLyB3ZSBtdXN0IGdlbmVyYXRlIGEgY2VudGVyIHZlcnRleCBwZXIgZmFjZS9zZWdtZW50XHJcblxyXG4gICAgZm9yIChsZXQgeCA9IDE7IHggPD0gcmFkaWFsU2VnbWVudHM7ICsreCkge1xyXG4gICAgICAvLyB2ZXJ0ZXhcclxuICAgICAgcG9zaXRpb25zWzMgKiBpbmRleF0gPSAwO1xyXG4gICAgICBwb3NpdGlvbnNbMyAqIGluZGV4ICsgMV0gPSBoYWxmSGVpZ2h0ICogc2lnbjtcclxuICAgICAgcG9zaXRpb25zWzMgKiBpbmRleCArIDJdID0gMDtcclxuXHJcbiAgICAgIC8vIG5vcm1hbFxyXG4gICAgICBub3JtYWxzWzMgKiBpbmRleF0gPSAwO1xyXG4gICAgICBub3JtYWxzWzMgKiBpbmRleCArIDFdID0gc2lnbjtcclxuICAgICAgbm9ybWFsc1szICogaW5kZXggKyAyXSA9IDA7XHJcblxyXG4gICAgICAvLyB1dlxyXG4gICAgICB1dnNbMiAqIGluZGV4XSA9IDAuNTtcclxuICAgICAgdXZzWzIgKiBpbmRleCArIDFdID0gMC41O1xyXG5cclxuICAgICAgLy8gaW5jcmVhc2UgaW5kZXhcclxuICAgICAgKytpbmRleDtcclxuICAgIH1cclxuXHJcbiAgICAvLyBzYXZlIHRoZSBpbmRleCBvZiB0aGUgbGFzdCBjZW50ZXIgdmVydGV4XHJcbiAgICBjb25zdCBjZW50ZXJJbmRleEVuZCA9IGluZGV4O1xyXG5cclxuICAgIC8vIG5vdyB3ZSBnZW5lcmF0ZSB0aGUgc3Vycm91bmRpbmcgcG9zaXRpb25zLCBub3JtYWxzIGFuZCB1dnNcclxuXHJcbiAgICBmb3IgKGxldCB4ID0gMDsgeCA8PSByYWRpYWxTZWdtZW50czsgKyt4KSB7XHJcbiAgICAgIGNvbnN0IHUgPSB4IC8gcmFkaWFsU2VnbWVudHM7XHJcbiAgICAgIGNvbnN0IHRoZXRhID0gdSAqIGFyYztcclxuXHJcbiAgICAgIGNvbnN0IGNvc1RoZXRhID0gTWF0aC5jb3ModGhldGEpO1xyXG4gICAgICBjb25zdCBzaW5UaGV0YSA9IE1hdGguc2luKHRoZXRhKTtcclxuXHJcbiAgICAgIC8vIHZlcnRleFxyXG4gICAgICBwb3NpdGlvbnNbMyAqIGluZGV4XSA9IHJhZGl1cyAqIHNpblRoZXRhO1xyXG4gICAgICBwb3NpdGlvbnNbMyAqIGluZGV4ICsgMV0gPSBoYWxmSGVpZ2h0ICogc2lnbjtcclxuICAgICAgcG9zaXRpb25zWzMgKiBpbmRleCArIDJdID0gcmFkaXVzICogY29zVGhldGE7XHJcblxyXG4gICAgICAvLyBub3JtYWxcclxuICAgICAgbm9ybWFsc1szICogaW5kZXhdID0gMDtcclxuICAgICAgbm9ybWFsc1szICogaW5kZXggKyAxXSA9IHNpZ247XHJcbiAgICAgIG5vcm1hbHNbMyAqIGluZGV4ICsgMl0gPSAwO1xyXG5cclxuICAgICAgLy8gdXZcclxuICAgICAgdXZzWzIgKiBpbmRleF0gPSAwLjUgLSAoc2luVGhldGEgKiAwLjUgKiBzaWduKTtcclxuICAgICAgdXZzWzIgKiBpbmRleCArIDFdID0gMC41ICsgKGNvc1RoZXRhICogMC41KTtcclxuXHJcbiAgICAgIC8vIGluY3JlYXNlIGluZGV4XHJcbiAgICAgICsraW5kZXg7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gZ2VuZXJhdGUgaW5kaWNlc1xyXG5cclxuICAgIGZvciAobGV0IHggPSAwOyB4IDwgcmFkaWFsU2VnbWVudHM7ICsreCkge1xyXG4gICAgICBjb25zdCBjID0gY2VudGVySW5kZXhTdGFydCArIHg7XHJcbiAgICAgIGNvbnN0IGkgPSBjZW50ZXJJbmRleEVuZCArIHg7XHJcblxyXG4gICAgICBpZiAodG9wKSB7XHJcbiAgICAgICAgLy8gZmFjZSB0b3BcclxuICAgICAgICBpbmRpY2VzW2luZGV4T2Zmc2V0XSA9IGkgKyAxOyArK2luZGV4T2Zmc2V0O1xyXG4gICAgICAgIGluZGljZXNbaW5kZXhPZmZzZXRdID0gYzsgKytpbmRleE9mZnNldDtcclxuICAgICAgICBpbmRpY2VzW2luZGV4T2Zmc2V0XSA9IGk7ICsraW5kZXhPZmZzZXQ7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gZmFjZSBib3R0b21cclxuICAgICAgICBpbmRpY2VzW2luZGV4T2Zmc2V0XSA9IGM7ICsraW5kZXhPZmZzZXQ7XHJcbiAgICAgICAgaW5kaWNlc1tpbmRleE9mZnNldF0gPSBpICsgMTsgKytpbmRleE9mZnNldDtcclxuICAgICAgICBpbmRpY2VzW2luZGV4T2Zmc2V0XSA9IGk7ICsraW5kZXhPZmZzZXQ7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbn1cclxuIl19