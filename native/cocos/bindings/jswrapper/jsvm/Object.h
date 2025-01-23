/****************************************************************************
 Copyright (c) 2021-2023 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
****************************************************************************/

#pragma once
#include <set>
#include <cassert>
#include "../PrivateObject.h"
#include "../RefCounter.h"
#include "../Value.h"
#include "../config.h"
#include "CommonHeader.h"
#include "HelperMacros.h"
#include "Utils.h"

namespace se {
class Class;
namespace internal {
struct PrivateData;
}

class ObjectRef {
private:
    JSVM_Ref _ref = nullptr;
    int _refCounts = 0;
    JSVM_Env _env = nullptr;
    JSVM_Value _obj = nullptr;

public:
    ~ObjectRef() {
        deleteRef();
    }
    
    JSVM_Value getValue(JSVM_Env env) const;

    void initWeakref(JSVM_Env env, JSVM_Value obj) {
        assert(_ref == nullptr);
        _obj = obj;
        _env = env;
        OH_JSVM_CreateReference(env, obj, 0, &_ref);
    }
    void setWeakref(JSVM_Env env, JSVM_Ref ref) {
        assert(_ref == nullptr);
        _ref = ref;
    }
    void initStrongRef(JSVM_Env env, JSVM_Value obj) {
        assert(_ref == nullptr);
        _refCounts = 1;
        _obj = obj;
        OH_JSVM_CreateReference(env, obj, _refCounts, &_ref);
        _env = env;
    }
    void incRef(JSVM_Env env) {
        assert(_refCounts == 0);
        if (_refCounts == 0) {
            uint32_t result = 0;
            _refCounts = 1;
            OH_JSVM_ReferenceRef(env, _ref, &result);
        }
    }
    void decRef(JSVM_Env env) {
        assert(_refCounts == 1);
        uint32_t result = 0;
        if (_refCounts > 0) {
            _refCounts--;
            if (_refCounts == 0) {
                OH_JSVM_ReferenceUnref(env, _ref, &result);
            }
        }
    }
    void deleteRef() {
        _refCounts = 0;
        if (!_ref) {
            return;
        }
        OH_JSVM_DeleteReference(_env, _ref);
        _ref = nullptr;
    }
};

class Object;

class Object : public RefCounter {
public:
    enum class TypedArrayType {
        NONE,
        INT8,
        INT16,
        INT32,
        UINT8,
        UINT8_CLAMPED,
        UINT16,
        UINT32,
        FLOAT32,
        FLOAT64,
        BIGINT64,
        BIGUINT64
    };

    static std::set<Object*> objBaseSet;
    static bool restarting;
    static void resetBaseSet() {
          objBaseSet.erase(objBaseSet.begin(), objBaseSet.end());
    }
    
    using BufferContentsFreeFunc = void (*)(void *contents, size_t byteLength, void *userData);

    struct ExternalArrayBufferCallbackParams {
        BufferContentsFreeFunc func{nullptr};
        void *contents{nullptr};
        size_t byteLength{0};
        void *userData{0};
    };

    Object();
    ~Object();
    /**
         *  @brief Sets a property to an object.
         *  @param[in] name A utf-8 string containing the property's name.
         *  @param[in] value A value to be used as the property's value.
         *  @return true if the property is set successfully, otherwise false.
         */
    bool setProperty(const char *name, const Value &data);

    inline bool setProperty(const std::string &name, const Value &value) {
        return setProperty(name.c_str(), value);
    }

    /**
         *  @brief Gets a property from an object.
         *  @param[in] name A utf-8 string containing the property's name.
         *  @param[out] value The property's value if object has the property, otherwise the undefined value.
         *  @return true if object has the property, otherwise false.
         */
    bool getProperty(const char *name, Value *data);

    inline bool getProperty(const char *name, Value *data, bool cachePropertyName) {
        return getProperty(name, data);
    }

    inline bool getProperty(const std::string &name, Value *value) {
        return getProperty(name.c_str(), value);
    }

    void setPrivateObject(PrivateObjectBase *data);
    PrivateObjectBase *getPrivateObject() const;

    /**
     * @brief Get the underlying private data as std::shared_ptr
     *
     * @tparam T
     * @return std::shared_ptr<T>
     */
    template <typename T>
    inline std::shared_ptr<T> getPrivateSharedPtr() const {
        assert(_privateObject->isSharedPtr());
        return static_cast<se::SharedPtrPrivateObject<T> *>(_privateObject)->getData();
    }

    /**
     * @brief Get the underlying private data as InstrusivePtr
     *
     * @tparam T
     * @return cc::IntrusivePtr<T>
     */
    template <typename T>
    inline cc::IntrusivePtr<T> getPrivateInstrusivePtr() const {
        assert(_privateObject->isCCIntrusivePtr());
        return static_cast<se::CCIntrusivePtrPrivateObject<T> *>(_privateObject)->getData();
    }

    /**
     *  @brief Delete a property of an object.
     *  @param[in] name A utf-8 string containing the property's name.
     *  @return true if the property is deleted successfully, otherwise false.
     */
    bool deleteProperty(const char *name);

    /**
     *  @brief Gets an object's private data.
     *  @return A void* that is the object's private data, if the object has private data, otherwise nullptr.
     */
    void *getPrivateData() const;

    /**
     *  @brief Sets a pointer to private data on an object.
     *  @param[in] data A void* to set as the object's private data.
     *  @note This method will associate private data with se::Object by ccstd::unordered_map::emplace.
     *        It's used for search a se::Object via a void* private data.
     */
    template <typename T>
    inline void setPrivateData(T *data) {
        static_assert(!std::is_void<T>::value, "void * is not allowed for private data");
        setPrivateObject(se::make_shared_private_object(data));
    }
    /**
     * @brief Use a InstrusivePtr to hold private data on the se::Object.
     *
     * @tparam T
     * @param data A intrusive pointer object
     */
    template <typename T>
    inline void setPrivateData(const cc::IntrusivePtr<T> &data) {
        setPrivateObject(se::ccintrusive_ptr_private_object(data));
    }

    /**
     * @brief Use a std::shared_ptr to hold private data on the se::Object.
     *
     * @tparam T
     * @param data A shared_ptr object
     */
    template <typename T>
    inline void setPrivateData(const std::shared_ptr<T> &data) {
        setPrivateObject(se::shared_ptr_private_object(data));
    }

    /**
     *  @brief Sets a pointer to private data on an object.
     *  @param[in] data A void* to set as the object's private data.
     *  @note This method will associate private data with se::Object by ccstd::unordered_map::emplace.
     *        It's used for search a se::Object via a void* private data.
     */
    template <typename T>
    inline void setRawPrivateData(T *data, bool tryDestroyInGC = false) {
        static_assert(!std::is_void<T>::value, "void * is not allowed for private data");
        auto *privateObject = se::rawref_private_object(data);
        if (tryDestroyInGC) {
            privateObject->tryAllowDestroyInGC();
        }
        setPrivateObject(privateObject);
    }

    /**
      *  @brief Clears private data of an object.
      *  @param clearMapping Whether to clear the mapping of native object & se::Object.
      */
    void clearPrivateData(bool clearMapping = true);

    /**
     * @brief Sets whether to clear the mapping of native object & se::Object in finalizer
     */
    void setClearMappingInFinalizer(bool v) { _clearMappingInFinalizer = v; }

    /**
         *  @brief Tests whether an object is an array.
         *  @return true if object is an array, otherwise false.
         */
    bool isArray() const;

    /**
         *  @brief Gets array length of an array object.
         *  @param[out] length The array length to be stored. It's set to 0 if there is an error.
         *  @return true if succeed, otherwise false.
         */
    bool getArrayLength(uint32_t *length) const;

    /**
         *  @brief Gets an element from an array object by numeric index.
         *  @param[in] index An integer value for index.
         *  @param[out] data The se::Value to be stored for the element in certain index.
         *  @return true if succeed, otherwise false.
         */
    bool getArrayElement(uint32_t index, Value *data) const;

    /**
         *  @brief Sets an element to an array object by numeric index.
         *  @param[in] index An integer value for index.
         *  @param[in] data The se::Value to be set to array with certain index.
         *  @return true if succeed, otherwise false.
         */
    bool setArrayElement(uint32_t index, const Value &data);

    /** @brief Tests whether an object is a typed array.
         *  @return true if object is a typed array, otherwise false.
         */
    bool isTypedArray() const;

    /** @brief Tests whether an object is a proxy object.
     *  @return true if object is a proxy object, otherwise false.
     */
    bool isProxy() const;

    /**
         *  @brief Gets the type of a typed array object.
         *  @return The type of a typed array object.
         */
    TypedArrayType getTypedArrayType() const;

    /**
         *  @brief Gets backing store of a typed array object.
         *  @param[out] ptr A temporary pointer to the backing store of a JavaScript Typed Array object.
         *  @param[out] length The byte length of a JavaScript Typed Array object.
         *  @return true if succeed, otherwise false.
         */
    bool getTypedArrayData(uint8_t **ptr, size_t *length) const;
    /**
         *  @brief Tests whether an object is an array buffer object.
         *  @return true if object is an array buffer object, otherwise false.
         */
    bool isArrayBuffer() const;

    /**
         *  @brief Gets buffer data of an array buffer object.
         *  @param[out] ptr A pointer to the data buffer that serves as the backing store for a JavaScript Typed Array object.
         *  @param[out] length The number of bytes in a JavaScript data object.
         *  @return true if succeed, otherwise false.
         */
    bool getArrayBufferData(uint8_t **ptr, size_t *length) const;

    /**
         *  @brief Creates a JavaScript Typed Array Object with specified format from an existing pointer,
                   if provide a null pointer,then will create a empty JavaScript Typed Array Object.
         *  @param[in] type The format of typed array.
         *  @param[in] data A pointer to the byte buffer to be used as the backing store of the Typed Array object.
         *  @param[in] byteLength The number of bytes pointed to by the parameter bytes.
         *  @return A JavaScript Typed Array Object whose backing store is the same as the one pointed data, or nullptr if there is an error.
         *  @note The return value (non-null) has to be released manually.
         */
    static Object *createTypedArray(TypedArrayType type, const void *data, size_t byteLength);

    static Object *createTypedArrayWithBuffer(TypedArrayType type, const Object *obj);
    static Object *createTypedArrayWithBuffer(TypedArrayType type, const Object *obj, size_t offset);
    static Object *createTypedArrayWithBuffer(TypedArrayType type, const Object *obj, size_t offset, size_t byteLength);
    static Object *createExternalArrayBufferObject(void *contents, size_t byteLength, BufferContentsFreeFunc freeFunc, void *freeUserData = nullptr);

    /**
         *  @brief Tests whether an object can be called as a function.
         *  @return true if object can be called as a function, otherwise false.
         */
    bool isFunction() const;

    /**
         *  @brief Defines a function with a native callback for an object.
         *  @param[in] funcName A utf-8 string containing the function name.
         *  @param[in] func The native callback triggered by JavaScript code.
         *  @return true if succeed, otherwise false.
         */
    bool defineFunction(const char *funcName, JSVM_Callback func);

    /**
         *  @brief Defines a property with native accessor callbacks for an object.
         *  @param[in] name A utf-8 string containing the property's name.
         *  @param[in] getter The native callback for getter.
         *  @param[in] setter The native callback for setter.
         *  @return true if succeed, otherwise false.
         */
    bool defineProperty(const char *name, JSVM_Callback getter, JSVM_Callback setter);

    bool attachObject(Object *obj);

    /**
         *  @brief Detaches an object from current object.
         *  @param[in] obj The object to be detached.
         *  @return true if succeed, otherwise false.
         *  @note The attached object will not be released if current object is not garbage collected.
         */
    bool detachObject(Object *obj);

    /**
         *  @brief Calls an object as a function.
         *  @param[in] args A se::Value array of arguments to pass to the function. Pass se::EmptyValueArray if argumentCount is 0.
         *  @param[in] thisObject The object to use as "this," or NULL to use the global object as "this."
         *  @param[out] rval The se::Value that results from calling object as a function, passing nullptr if return value is ignored.
         *  @return true if object is a function and there isn't any errors, otherwise false.
         */
    bool call(const ValueArray &args, Object *thisObject, Value *rval = nullptr);

    /**
         *  @brief Creates a JavaScript Native Binding Object from an existing se::Class instance.
         *  @param[in] cls The se::Class instance which stores native callback informations.
         *  @return A JavaScript Native Binding Object, or nullptr if there is an error.
         *  @note The return value (non-null) has to be released manually.
         */
    static Object *createObjectWithClass(Class *cls);

    static Object *_createJSObject(JSVM_Env env, JSVM_Value js_object, Class *cls);

    /**
         *  @brief Creates a JavaScript Object like `{} or new Object()`.
         *  @return A JavaScript Object, or nullptr if there is an error.
         *  @note The return value (non-null) has to be released manually.
         */
    static Object *createPlainObject();

    /**
         *  @brief Creates a JavaScript Array Object like `[] or new Array()`.
         *  @param[in] length The initical length of array.
         *  @return A JavaScript Array Object, or nullptr if there is an error.
         *  @note The return value (non-null) has to be released manually.
         */
    static Object *createArrayObject(size_t length);

    /**
         *  @brief Creates a JavaScript Array Buffer object from an existing pointer.
         *  @param[in] bytes A pointer to the byte buffer to be used as the backing store of the Typed Array object.
         *  @param[in] byteLength The number of bytes pointed to by the parameter bytes.
         *  @return A Array Buffer Object whose backing store is the same as the one pointed to data, or nullptr if there is an error.
         *  @note The return value (non-null) has to be released manually.
         */
    static Object *createArrayBufferObject(const void *data, size_t byteLength);
    /**
     * Gets the Proxy Target object
     * @param proxy The JavaScript Proxy object.
     * @return The target JavaScript object of the parameter.
     */
    static Object *createProxyTarget(se::Object *proxy);
    /**
         *  @brief Roots an object from garbage collection.
         *  @note Use this method when you want to store an object in a global or on the heap, where the garbage collector will not be able to discover your reference to it.
         *        An object may be rooted multiple times and must be unrooted an equal number of times before becoming eligible for garbage collection.
         */
    void root();

    /**
         *  @brief Unroots an object from garbage collection.
         *  @note An object may be rooted multiple times and must be unrooted an equal number of times before becoming eligible for garbage collection.
         */
    void unroot();

    /**
         *  @brief Tests whether an object is rooted.
         *  @return true if it has been already rooted, otherwise false.
         */
    bool isRooted() const;

    /**
         *  @brief Creates a JavaScript Object from a JSON formatted string.
         *  @param[in] jsonStr The utf-8 string containing the JSON string to be parsed.
         *  @return A JavaScript Object containing the parsed value, or nullptr if the input is invalid.
         *  @note The return value (non-null) has to be released manually.
         */
    static Object *createJSONObject(const std::string &jsonStr);
    static Object *createJSONObject(std::u16string &&jsonStr);
    /**
         *  @brief Gets all property names of an object.
         *  @param[out] allKeys A string vector to store all property names.
         *  @return true if succeed, otherwise false.
         */
    bool getAllKeys(std::vector<std::string> *allKeys) const;

    /**
         *  @brief Gets a se::Object from an existing native object pointer.
         *  @param[in] ptr The native object pointer associated with the se::Object
         *  @return A JavaScript Native Binding Object, or nullptr if there is an error.
         *  @note The return value (non-null) has to be released manually.
         */
    static Object *getObjectWithPtr(void *ptr);

    Class *_getClass() const; // NOLINT(readability-identifier-naming)
    JSVM_Value _getJSObject() const;
    void _setFinalizeCallback(JSVM_Finalize finalizeCb); // NOLINT(readability-identifier-naming)
    /**
         *  @brief Returns the string for describing current object.
         *  @return The string for describing current object.
         */
    std::string toString() const;

    bool init(JSVM_Env env, JSVM_Value js_object, Class *cls);

    static Object *createUTF8String(const std::string &str);

private:
    //     Object();
    //     virtual ~Object();
    static void sendWeakCallback(JSVM_Env env, void *nativeObject, void * /*finalize_hint*/);
    static void weakCallback(JSVM_Env env, void *nativeObject, void * /*finalize_hint*/);
    static void setup();
    static void cleanup();

private:
    ObjectRef _objRef;
    JSVM_Finalize _finalizeCb = nullptr;
    bool _clearMappingInFinalizer = true;
    void *_privateData = nullptr;
    PrivateObjectBase *_privateObject = nullptr;
    JSVM_Env _env = nullptr;
    Class *_cls = nullptr;
    uint32_t _rootCount = 0;
    bool _onCleaingPrivateData = false;
    internal::PrivateData *_internalData;

    friend class ScriptEngine;
};
}; // namespace se