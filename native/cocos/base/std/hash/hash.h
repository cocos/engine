
// Copyright 2005-2014 Daniel James.
// Distributed under the Boost Software License, Version 1.0. (See accompanying
// file LICENSE_1_0.txt or copy at http://www.boost.org/LICENSE_1_0.txt)

//  Based on Peter Dimov's proposal
//  http://www.open-std.org/JTC1/SC22/WG21/docs/papers/2005/n1756.pdf
//  issue 6.18.
//
//  This also contains public domain code from MurmurHash. From the
//  MurmurHash header:

// MurmurHash3 was written by Austin Appleby, and is placed in the public
// domain. The author hereby disclaims copyright to this source code.

#if !defined(CCSTD_FUNCTIONAL_HASH_HASH_HPP)
#define CCSTD_FUNCTIONAL_HASH_HASH_HPP

#include "boost/container_hash/hash.hpp"

#include "base/std/hash/hash_fwd.hpp"
#include <functional>
#include <iterator>
#include "base/std/hash/detail/hash_float.hpp"

#include <string>
#include <boost/limits.hpp>
#include <boost/type_traits/is_enum.hpp>
#include <boost/type_traits/is_integral.hpp>
#include <boost/core/enable_if.hpp>
#include <boost/cstdint.hpp>
#include <climits>

#if defined(BOOST_NO_TEMPLATE_PARTIAL_SPECIALIZATION)
#include <boost/type_traits/is_pointer.hpp>
#endif

#if !defined(BOOST_NO_CXX11_HDR_TYPEINDEX)
#include <typeindex>
#endif

#if !defined(BOOST_NO_CXX11_HDR_SYSTEM_ERROR)
#include <system_error>
#endif

#if defined(BOOST_MSVC)
#pragma warning(push)

#if BOOST_MSVC >= 1400
#pragma warning(disable:6295) // Ill-defined for-loop : 'unsigned int' values
                              // are always of range '0' to '4294967295'.
                              // Loop executes infinitely.
#endif

#endif

#if BOOST_WORKAROUND(__GNUC__, < 3) \
    && !defined(__SGI_STL_PORT) && !defined(_STLPORT_VERSION)
#define CCSTD_HASH_CHAR_TRAITS string_char_traits
#else
#define CCSTD_HASH_CHAR_TRAITS char_traits
#endif

#if defined(_MSC_VER)
#   define CCSTD_FUNCTIONAL_HASH_ROTL32(x, r) _rotl(x,r)
#else
#   define CCSTD_FUNCTIONAL_HASH_ROTL32(x, r) (x << r) | (x >> (32 - r))
#endif

// Detect whether standard library has C++17 headers

#if !defined(CCSTD_HASH_CXX17)
#   if defined(BOOST_MSVC)
#       if defined(_HAS_CXX17) && _HAS_CXX17
#           define CCSTD_HASH_CXX17 1
#       endif
#   elif defined(__cplusplus) && __cplusplus >= 201703
#       define CCSTD_HASH_CXX17 1
#   endif
#endif

#if !defined(CCSTD_HASH_CXX17)
#   define CCSTD_HASH_CXX17 0
#endif

#if CCSTD_HASH_CXX17 && defined(__has_include)
#   if !defined(CCSTD_HASH_HAS_STRING_VIEW) && __has_include(<string_view>)
#       define CCSTD_HASH_HAS_STRING_VIEW 1
#   endif
#   if !defined(CCSTD_HASH_HAS_OPTIONAL) && __has_include(<optional>)
#       define CCSTD_HASH_HAS_OPTIONAL 1
#   endif
#   if !defined(CCSTD_HASH_HAS_VARIANT) && __has_include(<variant>)
#       define CCSTD_HASH_HAS_VARIANT 1
#   endif
#endif

#if !defined(CCSTD_HASH_HAS_STRING_VIEW)
#   define CCSTD_HASH_HAS_STRING_VIEW 0
#endif

#if !defined(CCSTD_HASH_HAS_OPTIONAL)
#   define CCSTD_HASH_HAS_OPTIONAL 0
#endif

#if !defined(CCSTD_HASH_HAS_VARIANT)
#   define CCSTD_HASH_HAS_VARIANT 0
#endif

#if CCSTD_HASH_HAS_STRING_VIEW
#   include <string_view>
#endif

#if CCSTD_HASH_HAS_OPTIONAL
#   include <optional>
#endif

#if CCSTD_HASH_HAS_VARIANT
#   include <variant>
#endif

namespace ccstd
{
    namespace hash_detail
    {
#if defined(BOOST_NO_CXX98_FUNCTION_BASE)
        template <typename T>
        struct hash_base
        {
            typedef T argument_type;
            typedef hash_t result_type;
        };
#else
        template <typename T>
        struct hash_base : std::unary_function<T, hash_t> {};
#endif

        struct enable_hash_value { typedef hash_t type; };

        template <typename T> struct basic_numbers {};
        template <typename T> struct long_numbers;
        template <typename T> struct ulong_numbers;
        template <typename T> struct float_numbers {};

        template <> struct basic_numbers<bool> :
            ccstd::hash_detail::enable_hash_value {};
        template <> struct basic_numbers<char> :
            ccstd::hash_detail::enable_hash_value {};
        template <> struct basic_numbers<unsigned char> :
            ccstd::hash_detail::enable_hash_value {};
        template <> struct basic_numbers<signed char> :
            ccstd::hash_detail::enable_hash_value {};
        template <> struct basic_numbers<short> :
            ccstd::hash_detail::enable_hash_value {};
        template <> struct basic_numbers<unsigned short> :
            ccstd::hash_detail::enable_hash_value {};
        template <> struct basic_numbers<int> :
            ccstd::hash_detail::enable_hash_value {};
        template <> struct basic_numbers<unsigned int> :
            ccstd::hash_detail::enable_hash_value {};
        template <> struct basic_numbers<long> :
            ccstd::hash_detail::enable_hash_value {};
        template <> struct basic_numbers<unsigned long> :
            ccstd::hash_detail::enable_hash_value {};

#if !defined(BOOST_NO_INTRINSIC_WCHAR_T)
        template <> struct basic_numbers<wchar_t> :
            ccstd::hash_detail::enable_hash_value {};
#endif

#if !defined(BOOST_NO_CXX11_CHAR16_T)
        template <> struct basic_numbers<char16_t> :
            ccstd::hash_detail::enable_hash_value {};
#endif

#if !defined(BOOST_NO_CXX11_CHAR32_T)
        template <> struct basic_numbers<char32_t> :
            ccstd::hash_detail::enable_hash_value {};
#endif

        // long_numbers is defined like this to allow for separate
        // specialization for long_long and int128_type, in case
        // they conflict.
        template <typename T> struct long_numbers2 {};
        template <typename T> struct ulong_numbers2 {};
        template <typename T> struct long_numbers : long_numbers2<T> {};
        template <typename T> struct ulong_numbers : ulong_numbers2<T> {};

#if !defined(BOOST_NO_LONG_LONG)
        template <> struct long_numbers<boost::long_long_type> :
            ccstd::hash_detail::enable_hash_value {};
        template <> struct ulong_numbers<boost::ulong_long_type> :
            ccstd::hash_detail::enable_hash_value {};
#endif

#if defined(BOOST_HAS_INT128)
        template <> struct long_numbers2<boost::int128_type> :
            ccstd::hash_detail::enable_hash_value {};
        template <> struct ulong_numbers2<boost::uint128_type> :
            ccstd::hash_detail::enable_hash_value {};
#endif

        template <> struct float_numbers<float> :
            ccstd::hash_detail::enable_hash_value {};
        template <> struct float_numbers<double> :
            ccstd::hash_detail::enable_hash_value {};
        template <> struct float_numbers<long double> :
            ccstd::hash_detail::enable_hash_value {};
    }

    template <typename T>
    typename ccstd::hash_detail::basic_numbers<T>::type hash_value(T);
    template <typename T>
    typename ccstd::hash_detail::long_numbers<T>::type hash_value(T);
    template <typename T>
    typename ccstd::hash_detail::ulong_numbers<T>::type hash_value(T);

    template <typename T>
    typename boost::enable_if<boost::is_enum<T>, hash_t>::type
        hash_value(T);

#if !BOOST_WORKAROUND(__DMC__, <= 0x848)
    template <class T> hash_t hash_value(T* const&);
#else
    template <class T> hash_t hash_value(T*);
#endif

#if !defined(BOOST_NO_FUNCTION_TEMPLATE_ORDERING)
    template< class T, unsigned N >
    hash_t hash_value(const T (&x)[N]);

    template< class T, unsigned N >
    hash_t hash_value(T (&x)[N]);
#endif

    template <class Ch, class A>
    hash_t hash_value(
        std::basic_string<Ch, std::CCSTD_HASH_CHAR_TRAITS<Ch>, A> const&);

#if CCSTD_HASH_HAS_STRING_VIEW
    template <class Ch>
    hash_t hash_value(
        std::basic_string_view<Ch, std::CCSTD_HASH_CHAR_TRAITS<Ch> > const&);
#endif

    template <typename T>
    typename ccstd::hash_detail::float_numbers<T>::type hash_value(T);

#if CCSTD_HASH_HAS_OPTIONAL
    template <typename T>
    hash_t hash_value(std::optional<T> const&);
#endif

#if CCSTD_HASH_HAS_VARIANT
    hash_t hash_value(std::monostate);
    template <typename... Types>
    hash_t hash_value(std::variant<Types...> const&);
#endif

#if !defined(BOOST_NO_CXX11_HDR_TYPEINDEX)
    hash_t hash_value(std::type_index);
#endif

#if !defined(BOOST_NO_CXX11_HDR_SYSTEM_ERROR)
    hash_t hash_value(std::error_code const&);
    hash_t hash_value(std::error_condition const&);
#endif

    // Implementation

    namespace hash_detail
    {
        template <class T>
        inline hash_t hash_value_signed(T val)
        {
             const unsigned int size_t_bits = std::numeric_limits<hash_t>::digits;
             // ceiling(std::numeric_limits<T>::digits / size_t_bits) - 1
             const int length = (std::numeric_limits<T>::digits - 1)
                 / static_cast<int>(size_t_bits);

             hash_t seed = 0;
             T positive = val < 0 ? -1 - val : val;

             // Hopefully, this loop can be unrolled.
             for(unsigned int i = length * size_t_bits; i > 0; i -= size_t_bits)
             {
                 seed ^= (hash_t) (positive >> i) + (seed<<6) + (seed>>2);
             }
             seed ^= (hash_t) val + (seed<<6) + (seed>>2);

             return seed;
        }

        template <class T>
        inline hash_t hash_value_unsigned(T val)
        {
             const unsigned int size_t_bits = std::numeric_limits<hash_t>::digits;
             // ceiling(std::numeric_limits<T>::digits / size_t_bits) - 1
             const int length = (std::numeric_limits<T>::digits - 1)
                 / static_cast<int>(size_t_bits);

             hash_t seed = 0;

             // Hopefully, this loop can be unrolled.
             for(unsigned int i = length * size_t_bits; i > 0; i -= size_t_bits)
             {
                 seed ^= (hash_t) (val >> i) + (seed<<6) + (seed>>2);
             }
             seed ^= (hash_t) val + (seed<<6) + (seed>>2);

             return seed;
        }

        template<hash_t Bits> struct hash_combine_impl
        {
            template <typename SizeT>
            inline static SizeT fn(SizeT seed, SizeT value)
            {
                seed ^= value + 0x9e3779b9 + (seed<<6) + (seed>>2);
                return seed;
            }
        };

        template<> struct hash_combine_impl<32>
        {
            inline static std::uint32_t fn(std::uint32_t h1, std::uint32_t k1)
            {
                const std::uint32_t c1 = 0xcc9e2d51;
                const std::uint32_t c2 = 0x1b873593;

                k1 *= c1;
                k1 = CCSTD_FUNCTIONAL_HASH_ROTL32(k1,15);
                k1 *= c2;

                h1 ^= k1;
                h1 = CCSTD_FUNCTIONAL_HASH_ROTL32(h1,13);
                h1 = h1*5+0xe6546b64;

                return h1;
            }
        };

        template<> struct hash_combine_impl<64>
        {
            inline static std::uint64_t fn(std::uint64_t h, std::uint64_t k)
            {
                const std::uint64_t m = (std::uint64_t(0xc6a4a793) << 32) + 0x5bd1e995;
                const int r = 47;

                k *= m;
                k ^= k >> r;
                k *= m;

                h ^= k;
                h *= m;

                // Completely arbitrary number, to prevent 0's
                // from hashing to 0.
                h += 0xe6546b64;

                return h;
            }
        };
    }

    template <typename T>
    typename ccstd::hash_detail::basic_numbers<T>::type hash_value(T v)
    {
        return static_cast<hash_t>(v);
    }

    template <typename T>
    typename ccstd::hash_detail::long_numbers<T>::type hash_value(T v)
    {
        return hash_detail::hash_value_signed(v);
    }

    template <typename T>
    typename ccstd::hash_detail::ulong_numbers<T>::type hash_value(T v)
    {
        return hash_detail::hash_value_unsigned(v);
    }

    template <typename T>
    typename boost::enable_if<boost::is_enum<T>, hash_t>::type
        hash_value(T v)
    {
        return static_cast<hash_t>(v);
    }

    // Implementation by Alberto Barbati and Dave Harris.
#if !BOOST_WORKAROUND(__DMC__, <= 0x848)
    template <class T> hash_t hash_value(T* const& v)
#else
    template <class T> hash_t hash_value(T* v)
#endif
    {
#if defined(__VMS) && __INITIAL_POINTER_SIZE == 64
    // for some reason ptrdiff_t on OpenVMS compiler with
    // 64 bit is not 64 bit !!!
        hash_t x = static_cast<hash_t>(
           reinterpret_cast<long long int>(v));
#else
        hash_t x = static_cast<hash_t>(
           reinterpret_cast<std::ptrdiff_t>(v));
#endif
        return x + (x >> 3);
    }

#if defined(BOOST_MSVC)
#pragma warning(push)
#if BOOST_MSVC <= 1400
#pragma warning(disable:4267) // 'argument' : conversion from 'size_t' to
                              // 'unsigned int', possible loss of data
                              // A misguided attempt to detect 64-bit
                              // incompatability.
#endif
#endif

    template <class T>
    inline void hash_combine(hash_t& seed, T const& v)
    {
        ccstd::hash<T> hasher;
        seed = ccstd::hash_detail::hash_combine_impl<sizeof(hash_t) * CHAR_BIT>::fn(seed, hasher(v));
    }

#if defined(BOOST_MSVC)
#pragma warning(pop)
#endif

    template <class It>
    inline hash_t hash_range(It first, It last)
    {
        hash_t seed = 0;

        for(; first != last; ++first)
        {
            hash_combine<typename std::iterator_traits<It>::value_type>(seed, *first);
        }

        return seed;
    }

    template <class It>
    inline void hash_range(hash_t& seed, It first, It last)
    {
        for(; first != last; ++first)
        {
            hash_combine<typename std::iterator_traits<It>::value_type>(seed, *first);
        }
    }

#if BOOST_WORKAROUND(BOOST_BORLANDC, BOOST_TESTED_AT(0x551))
    template <class T>
    inline hash_t hash_range(T* first, T* last)
    {
        hash_t seed = 0;

        for(; first != last; ++first)
        {
            ccstd::hash<T> hasher;
            seed ^= hasher(*first) + 0x9e3779b9 + (seed<<6) + (seed>>2);
        }

        return seed;
    }

    template <class T>
    inline void hash_range(hash_t& seed, T* first, T* last)
    {
        for(; first != last; ++first)
        {
            ccstd::hash<T> hasher;
            seed ^= hasher(*first) + 0x9e3779b9 + (seed<<6) + (seed>>2);
        }
    }
#endif

#if !defined(BOOST_NO_FUNCTION_TEMPLATE_ORDERING)
    template< class T, unsigned N >
    inline hash_t hash_value(const T (&x)[N])
    {
        return hash_range(x, x + N);
    }

    template< class T, unsigned N >
    inline hash_t hash_value(T (&x)[N])
    {
        return hash_range(x, x + N);
    }
#endif

    template <class Ch, class A>
    inline hash_t hash_value(
        std::basic_string<Ch, std::CCSTD_HASH_CHAR_TRAITS<Ch>, A> const& v)
    {
        return hash_range(v.begin(), v.end());
    }

#if CCSTD_HASH_HAS_STRING_VIEW
    template <class Ch>
    inline hash_t hash_value(
        std::basic_string_view<Ch, std::CCSTD_HASH_CHAR_TRAITS<Ch> > const& v)
    {
        return hash_range(v.begin(), v.end());
    }
#endif

    template <typename T>
    typename ccstd::hash_detail::float_numbers<T>::type hash_value(T v)
    {
        return ccstd::hash_detail::float_hash_value(v);
    }

#if CCSTD_HASH_HAS_OPTIONAL
    template <typename T>
    inline hash_t hash_value(std::optional<T> const& v) {
        if (!v) {
            // Arbitray value for empty optional.
            return 0x12345678;
        } else {
            ccstd::hash<T> hf;
            return hf(*v);
        }
    }
#endif

#if CCSTD_HASH_HAS_VARIANT
    inline hash_t hash_value(std::monostate) {
        return 0x87654321;
    }

    template <typename... Types>
    inline hash_t hash_value(std::variant<Types...> const& v) {
        hash_t seed = 0;
        hash_combine(seed, v.index());
        std::visit([&seed](auto&& x) { hash_combine(seed, x); }, v);
        return seed;
    }
#endif


#if !defined(BOOST_NO_CXX11_HDR_TYPEINDEX)
    inline hash_t hash_value(std::type_index v)
    {
        size_t hash = v.hash_code();

#ifndef INTPTR_MAX
#error "no INTPTR_MAX"
#endif

#ifndef INT64_MAX
#error "no INT64_MAX"
#endif

#if INTPTR_MAX == INT64_MAX
        hash = (hash >> 32) ^ (hash & 0xFFFFFFFF);
#endif
        return static_cast<hash_t>(hash);
    }
#endif

#if !defined(BOOST_NO_CXX11_HDR_SYSTEM_ERROR)
    inline hash_t hash_value(std::error_code const& v) {
        hash_t seed = 0;
        hash_combine(seed, v.value());
        hash_combine(seed, &v.category());
        return seed;
    }

    inline hash_t hash_value(std::error_condition const& v) {
        hash_t seed = 0;
        hash_combine(seed, v.value());
        hash_combine(seed, &v.category());
        return seed;
    }
#endif

    //
    // ccstd::hash
    //

    // Define the specializations required by the standard. The general purpose
    // ccstd::hash is defined later in extensions.hpp if
    // CCSTD_HASH_NO_EXTENSIONS is not defined.

    // CCSTD_HASH_SPECIALIZE - define a specialization for a type which is
    // passed by copy.
    //
    // CCSTD_HASH_SPECIALIZE_REF - define a specialization for a type which is
    // passed by const reference.
    //
    // These are undefined later.

#define CCSTD_HASH_SPECIALIZE(type) \
    template <> struct hash<type> \
         : public ccstd::hash_detail::hash_base<type> \
    { \
        hash_t operator()(type v) const \
        { \
            return ccstd::hash_value(v); \
        } \
    };

#define CCSTD_HASH_SPECIALIZE_REF(type) \
    template <> struct hash<type> \
         : public ccstd::hash_detail::hash_base<type> \
    { \
        hash_t operator()(type const& v) const \
        { \
            return ccstd::hash_value(v); \
        } \
    };

#define CCSTD_HASH_SPECIALIZE_TEMPLATE_REF(type) \
    struct hash<type> \
         : public ccstd::hash_detail::hash_base<type> \
    { \
        hash_t operator()(type const& v) const \
        { \
            return ccstd::hash_value(v); \
        } \
    };

    CCSTD_HASH_SPECIALIZE(bool)
    CCSTD_HASH_SPECIALIZE(char)
    CCSTD_HASH_SPECIALIZE(signed char)
    CCSTD_HASH_SPECIALIZE(unsigned char)
#if !defined(BOOST_NO_INTRINSIC_WCHAR_T)
    CCSTD_HASH_SPECIALIZE(wchar_t)
#endif
#if !defined(BOOST_NO_CXX11_CHAR16_T)
    CCSTD_HASH_SPECIALIZE(char16_t)
#endif
#if !defined(BOOST_NO_CXX11_CHAR32_T)
    CCSTD_HASH_SPECIALIZE(char32_t)
#endif
    CCSTD_HASH_SPECIALIZE(short)
    CCSTD_HASH_SPECIALIZE(unsigned short)
    CCSTD_HASH_SPECIALIZE(int)
    CCSTD_HASH_SPECIALIZE(unsigned int)
    CCSTD_HASH_SPECIALIZE(long)
    CCSTD_HASH_SPECIALIZE(unsigned long)

    CCSTD_HASH_SPECIALIZE(float)
    CCSTD_HASH_SPECIALIZE(double)
    CCSTD_HASH_SPECIALIZE(long double)

    CCSTD_HASH_SPECIALIZE_REF(std::string)
#if !defined(BOOST_NO_STD_WSTRING) && !defined(BOOST_NO_INTRINSIC_WCHAR_T)
    CCSTD_HASH_SPECIALIZE_REF(std::wstring)
#endif
#if !defined(BOOST_NO_CXX11_CHAR16_T)
    CCSTD_HASH_SPECIALIZE_REF(std::basic_string<char16_t>)
#endif
#if !defined(BOOST_NO_CXX11_CHAR32_T)
    CCSTD_HASH_SPECIALIZE_REF(std::basic_string<char32_t>)
#endif

#if CCSTD_HASH_HAS_STRING_VIEW
    CCSTD_HASH_SPECIALIZE_REF(std::string_view)
#   if !defined(BOOST_NO_STD_WSTRING) && !defined(BOOST_NO_INTRINSIC_WCHAR_T)
    CCSTD_HASH_SPECIALIZE_REF(std::wstring_view)
#   endif
#   if !defined(BOOST_NO_CXX11_CHAR16_T)
    CCSTD_HASH_SPECIALIZE_REF(std::basic_string_view<char16_t>)
#   endif
#   if !defined(BOOST_NO_CXX11_CHAR32_T)
    CCSTD_HASH_SPECIALIZE_REF(std::basic_string_view<char32_t>)
#   endif
#endif

#if !defined(BOOST_NO_LONG_LONG)
    CCSTD_HASH_SPECIALIZE(boost::long_long_type)
    CCSTD_HASH_SPECIALIZE(boost::ulong_long_type)
#endif

#if defined(BOOST_HAS_INT128)
    CCSTD_HASH_SPECIALIZE(boost::int128_type)
    CCSTD_HASH_SPECIALIZE(boost::uint128_type)
#endif

#if CCSTD_HASH_HAS_OPTIONAL
    template <typename T>
    CCSTD_HASH_SPECIALIZE_TEMPLATE_REF(std::optional<T>)
#endif

#if !defined(CCSTD_HASH_HAS_VARIANT)
    template <typename... T>
    CCSTD_HASH_SPECIALIZE_TEMPLATE_REF(std::variant<T...>)
    CCSTD_HASH_SPECIALIZE(std::monostate)
#endif

#if !defined(BOOST_NO_CXX11_HDR_TYPEINDEX)
    CCSTD_HASH_SPECIALIZE(std::type_index)
#endif

#undef CCSTD_HASH_SPECIALIZE
#undef CCSTD_HASH_SPECIALIZE_REF
#undef CCSTD_HASH_SPECIALIZE_TEMPLATE_REF

// Specializing ccstd::hash for pointers.

#if !defined(BOOST_NO_TEMPLATE_PARTIAL_SPECIALIZATION)

    template <class T>
    struct hash<T*>
        : public ccstd::hash_detail::hash_base<T*>
    {
        hash_t operator()(T* v) const
        {
#if !BOOST_WORKAROUND(__SUNPRO_CC, <= 0x590)
            return ccstd::hash_value(v);
#else
            hash_t x = static_cast<hash_t>(
                reinterpret_cast<std::ptrdiff_t>(v));

            return x + (x >> 3);
#endif
        }
    };

#else

    // For compilers without partial specialization, we define a
    // ccstd::hash for all remaining types. But hash_impl is only defined
    // for pointers in 'extensions.hpp' - so when CCSTD_HASH_NO_EXTENSIONS
    // is defined there will still be a compile error for types not supported
    // in the standard.

    namespace hash_detail
    {
        template <bool IsPointer>
        struct hash_impl;

        template <>
        struct hash_impl<true>
        {
            template <class T>
            struct inner
                : public ccstd::hash_detail::hash_base<T>
            {
                hash_t operator()(T val) const
                {
#if !BOOST_WORKAROUND(__SUNPRO_CC, <= 590)
                    return ccstd::hash_value(val);
#else
                    hash_t x = static_cast<hash_t>(
                        reinterpret_cast<std::ptrdiff_t>(val));

                    return x + (x >> 3);
#endif
                }
            };
        };
    }

    template <class T> struct hash
        : public ccstd::hash_detail::hash_impl<ccstd::is_pointer<T>::value>
            ::BOOST_NESTED_TEMPLATE inner<T>
    {
    };

#endif
}

#undef CCSTD_HASH_CHAR_TRAITS
#undef CCSTD_FUNCTIONAL_HASH_ROTL32

#if defined(BOOST_MSVC)
#pragma warning(pop)
#endif

#endif // CCSTD_FUNCTIONAL_HASH_HASH_HPP

// Include this outside of the include guards in case the file is included
// twice - once with CCSTD_HASH_NO_EXTENSIONS defined, and then with it
// undefined.

#if !defined(CCSTD_HASH_NO_EXTENSIONS) \
    && !defined(CCSTD_FUNCTIONAL_HASH_EXTENSIONS_HPP)
#include "base/std/hash/extensions.hpp" // NOLINT(misc-header-include-cycle)
#endif
