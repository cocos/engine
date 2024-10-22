var spine;
(function (spine) {

    function defineReverseKeyEnum(e) {
        for (var key in e) {
            var value = e[key];
            e[value] = key;
        }
    }

    var e = spine.MixBlend = {
        setup: 0,
        first: 1,
        replace: 2,
        add: 3
    };
    defineReverseKeyEnum(e);
    
    e = spine.MixDirection = {
        mixIn: 0,
        mixOut: 1
    };
    defineReverseKeyEnum(e);

    e = spine.TimelineType = {
        rotate: 0,
        translate: 1,
        scale: 2,
        shear: 3,
        attachment: 4,
        color: 5,
        deform: 6,
        event: 7,
        drawOrder: 8,
        ikConstraint: 9,
        transformConstraint: 10,
        pathConstraintPosition: 11,
        pathConstraintSpacing: 12,
        pathConstraintMix: 13,
        twoColor: 14
    };
    defineReverseKeyEnum(e);

    e = spine.EventType = {
        start:0,
        interrupt: 1,
        end: 2,
        dispose: 3,
        complete: 4,
        event: 5
    };
    defineReverseKeyEnum(e);

    e = spine.BlendMode = {
        Normal:0,
        Additive: 1,
        Multiply: 2,
        Screen: 3
    };
    defineReverseKeyEnum(e);

    e = spine.TransformMode = {
        Normal: 0,
        OnlyTranslation: 1,
        NoRotationOrReflection: 2,
        NoScale: 3,
        NoScaleOrReflection: 4
    };
    defineReverseKeyEnum(e);

    e = spine.PositionMode = {
        Fixed: 0,
        Percent: 1
    };
    defineReverseKeyEnum(e);
    
    e = spine.SpacingMode = {
        Length: 0,
        Fixed: 1,
        Percent: 2
    };
    defineReverseKeyEnum(e);

    e = spine.RotateMode = {
        Tangent: 0,
        Chain: 1,
        ChainScale: 2
    };
    defineReverseKeyEnum(e);

    e = spine.TextureFilter = {
        Nearest: 9728,
        Linear: 9729,
        MipMap: 9987,
        MipMapNearestNearest: 9984,
        MipMapLinearNearest: 9985,
        MipMapNearestLinear: 9986,
        MipMapLinearLinear: 9987
    };
    defineReverseKeyEnum(e);
    
    e = spine.TextureWrap = {
        MirroredRepeat: 33648,
        ClampToEdge: 33071,
        Repeat: 10497
    };
    defineReverseKeyEnum(e);

    e = spine.AttachmentType = {
        Region: 0,
        BoundingBox: 1,
        Mesh: 2,
        LinkedMesh: 3,
        Path: 4,
        Point: 5,
        Clipping: 6
    };
    defineReverseKeyEnum(e);

    e = null;

    const PI = 3.1415927;
    const PI2 = PI * 2;
    const radiansToDegrees = 180 / PI;
    const radDeg = radiansToDegrees;
    const degreesToRadians = PI / 180;
    const degRad = degreesToRadians;

    spine.MathUtils = class MathUtils {
        static PI = PI;
        static PI2 = PI2;
        static radiansToDegrees = radiansToDegrees;
        static radDeg = radDeg;
        static degreesToRadians = degreesToRadians;
        static degRad = degRad;

		static clamp (value, min, max) {
			if (value < min) return min;
			if (value > max) return max;
			return value;
		}

		static cosDeg (degrees) {
			return Math.cos(degrees * degRad);
		}

		static sinDeg (degrees) {
			return Math.sin(degrees * degRad);
		}

		static signum (value) {
			return value > 0 ? 1 : value < 0 ? -1 : 0;
		}

		static toInt (x) {
			return x > 0 ? Math.floor(x) : Math.ceil(x);
		}

		static cbrt (x) {
			let y = Math.pow(Math.abs(x), 1/3);
			return x < 0 ? -y : y;
		}

		static randomTriangular (min, max) {
			return MathUtils.randomTriangularWith(min, max, (min + max) * 0.5);
		}

		static randomTriangularWith (min, max, mode) {
			let u = Math.random();
			let d = max - min;
			if (u <= (mode - min) / d) return min + Math.sqrt(u * d * (mode - min));
			return max - Math.sqrt((1 - u) * d * (max - mode));
		}
	}

})(spine || (spine = {}));
export default spine;
