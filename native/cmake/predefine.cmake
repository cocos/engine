
set(CC_PLATFORM_IOS 1)
set(CC_PLATFORM_WINDOWS 2)
set(CC_PLATFORM_ANDROID 3)
set(CC_PLATFORM_MACOS 4)
set(CC_PLATFORM_OHOS    5)
set(CC_PLATFORM_LINUX   6)
set(CC_PLATFORM_QNX     7)
set(CC_PLATFORM_NX      8)
set(CC_PLATFORM_EMSCRIPTEN  9)
set(CC_PLATFORM_OPENHARMONY 10)
set(CC_PLATFORM 1)

if(NX)
    if(NOT DEFINED ENV{NINTENDO_SDK_ROOT})
        message(FATAL_ERROR "Nintendo SDK not found")
        return()
    endif()
    if(NOT IS_DIRECTORY ${CMAKE_CURRENT_LIST_DIR}/../platform-nx)
        message(FATAL_ERROR "platform adaptation package not found")
        return()
    endif()
    if(NOT ${CMAKE_SYSTEM_NAME} MATCHES "Windows")
        message(FATAL_ERROR "Only windows environment is supported")
        return()
    endif()

    if (CC_NX_WINDOWS) # windows reference
        set(WINDOWS TRUE)
        set(CC_PLATFORM ${CC_PLATFORM_WINDOWS})
    else()
        set(CC_PLATFORM ${CC_PLATFORM_NX})
    endif()
elseif(${CMAKE_SYSTEM_NAME} MATCHES "Windows")
    set(WINDOWS TRUE)
    set(PLATFORM_FOLDER windows)
    set(CC_PLATFORM ${CC_PLATFORM_WINDOWS})
elseif(${CMAKE_SYSTEM_NAME} MATCHES "Android")
    set(PLATFORM_FOLDER android)
    set(ANDROID TRUE)
    set(CC_PLATFORM ${CC_PLATFORM_ANDROID})
elseif(${CMAKE_SYSTEM_NAME} MATCHES "Darwin")
    set(APPLE TRUE)
    set(MACOSX TRUE)
    set(PLATFORM_FOLDER mac)
    set(CC_PLATFORM ${CC_PLATFORM_MACOS})
elseif(${CMAKE_SYSTEM_NAME} MATCHES "Linux")
    set(LINUX TRUE)
    set(PLATFORM_FOLDER linux)
    set(CC_PLATFORM ${CC_PLATFORM_LINUX})
    add_definitions(-D__LINUX__=1)
elseif(${CMAKE_SYSTEM_NAME} MATCHES "iOS")
    set(APPLE TRUE)
    set(IOS TRUE)
    set(PLATFORM_FOLDER ios)
    set(CC_PLATFORM ${CC_PLATFORM_IOS})
elseif(${CMAKE_SYSTEM_NAME} MATCHES "QNX")
    if(NOT IS_DIRECTORY ${QNX_PATH})
        message(FATAL_ERROR "platform adaptation package not found")
        return()
    endif()
    set(QNX TRUE)
    set(PLATFORM_FOLDER qnx)
    set(CC_PLATFORM ${CC_PLATFORM_QNX})
    add_definitions(-D__QNX__=1)
elseif(OPENHARMONY)
    set(OPENHARMONY TRUE)
    set(CC_PLATFORM ${CC_PLATFORM_OPENHARMONY})
    add_definitions(-D__OPENHARMONY__=1)
    set(PLATFORM_FOLDER openharmony)
    set(CMAKE_CXX_FLAGS "-fvisibility=hidden -fvisibility-inlines-hidden ${CMAKE_CXX_FLAGS}")
    if("${OHOS_ARCH}" STREQUAL "armeabi-v7a")
        set(CMAKE_CXX_FLAGS "-march=armv7a ${CMAKE_CXX_FLAGS}")
    endif()
elseif(${CMAKE_SYSTEM_NAME} MATCHES "Emscripten")
    set(CC_WGPU_WASM TRUE)
    set(CC_PLATFORM ${CC_PLATFORM_EMSCRIPTEN})
    set(EMSCRIPTEN TRUE)
    add_definitions(-DCC_WGPU_WASM=1)
elseif(OHOS)
    set(OHOS TRUE)
    set(CC_PLATFORM ${CC_PLATFORM_OHOS})
    add_definitions(-D__OHOS__=1)
    set(PLATFORM_FOLDER ohos)
else()
    message(FATAL_ERROR "Unsupported platform '${CMAKE_SYSTEM_NAME}', CMake will exit!")
    return()
endif()

MESSAGE(STATUS "platform: ${CMAKE_SYSTEM_NAME}")

# platform macros
add_definitions(-DCC_PLATFORM_WINDOWS=${CC_PLATFORM_WINDOWS})
add_definitions(-DCC_PLATFORM_MACOS=${CC_PLATFORM_MACOS})
add_definitions(-DCC_PLATFORM_IOS=${CC_PLATFORM_IOS})
add_definitions(-DCC_PLATFORM_MAC_OSX=${CC_PLATFORM_MACOS}) # keep compatible
add_definitions(-DCC_PLATFORM_MAC_IOS=${CC_PLATFORM_IOS}) # keep compatible
add_definitions(-DCC_PLATFORM_ANDROID=${CC_PLATFORM_ANDROID})
add_definitions(-DCC_PLATFORM_OHOS=${CC_PLATFORM_OHOS})
add_definitions(-DCC_PLATFORM_LINUX=${CC_PLATFORM_LINUX})
add_definitions(-DCC_PLATFORM_QNX=${CC_PLATFORM_QNX})
add_definitions(-DCC_PLATFORM_NX=${CC_PLATFORM_NX})
add_definitions(-DCC_PLATFORM_OPENHARMONY=${CC_PLATFORM_OPENHARMONY})
add_definitions(-DCC_PLATFORM_EMSCRIPTEN=${CC_PLATFORM_EMSCRIPTEN})
add_definitions(-DCC_PLATFORM=${CC_PLATFORM})


# simplify generator condition, please use them everywhere
if(CMAKE_GENERATOR STREQUAL Xcode)
    set(XCODE TRUE)
elseif(CMAKE_GENERATOR MATCHES Visual)
    set(VS TRUE)
endif()

# generators that are capable of organizing into a hierarchy of folders
set_property(GLOBAL PROPERTY USE_FOLDERS ON)

# set c++ standard
set(CMAKE_C_STANDARD 99)
set(CMAKE_C_STANDARD_REQUIRED ON)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

if("$ENV{COCOS_ENGINE_DEV}" EQUAL "1")
    set(WERROR_FLAGS "-Werror -Werror=return-type") # -Wshorten-64-to-32 -Werror=return-type
    
    if(APPLE)
        set(WERROR_FLAGS " ${WERROR_FLAGS} -Wno-deprecated-declarations -Wno-deprecated-builtins -Wno-unqualified-std-cast-call")
    elseif(LINUX)
        set(WERROR_FLAGS " ${WERROR_FLAGS} -Wno-nullability-completeness -Wno-deprecated-declarations")
    elseif(ANDROID)
        set(WERROR_FLAGS " ${WERROR_FLAGS} -Wno-deprecated-declarations -Wno-unknown-warning-option -Wno-deprecated-builtins")
    elseif(OPENHARMONY)
        set(WERROR_FLAGS " ${WERROR_FLAGS} -Wno-deprecated-declarations -Wno-deprecated-builtins -Wno-unused-command-line-argument -Wno-format")
    endif()

    if(CMAKE_CXX_COMPILER_ID MATCHES "GNU")
        set(WERROR_FLAGS " ${WERROR_FLAGS} -Wno-invalid-offsetof")
    endif()

    if ("${CMAKE_CXX_COMPILER_ID}" STREQUAL "MSVC")
        set(WERROR_FLAGS "/WX")
    endif()
    message(STATUS "Enable NO_WERROR")
else()
    if ("${CMAKE_CXX_COMPILER_ID}" STREQUAL "MSVC")
        set(WERROR_FLAGS "")
    else()
        set(WERROR_FLAGS "-Werror=return-type")
    endif()
    message(STATUS "Ignore NO_WERROR")
endif()

if(ANDROID)
    if("${ANDROID_ABI}" STREQUAL "armeabi-v7a")
        set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -mfpu=neon-fp16")
        set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -mfpu=neon-fp16")
    endif()
    
    set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -fsigned-char -ffunction-sections -fdata-sections -fstrict-aliasing")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fsigned-char -ffunction-sections -fdata-sections -fstrict-aliasing -frtti -fexceptions")

    
    if("${CMAKE_BUILD_TYPE}" STREQUAL "Debug")
        set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -fvisibility=default -fno-omit-frame-pointer")
        set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fvisibility=default -fno-omit-frame-pointer")
    else()
        if(NOT DEFINED HIDE_SYMBOLS OR HIDE_SYMBOLS) # hidden by default
            set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -fvisibility=hidden")
            set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fvisibility=hidden -fvisibility-inlines-hidden")
        endif()
    endif()
endif()

function(cc_enable_werror source_list)
    foreach(src IN LISTS source_list)
        if("${src}" MATCHES "\\.(cpp|mm|c|m)\$")
            set_source_files_properties("${src}" PROPERTIES
                COMPILE_FLAGS "${WERROR_FLAGS}"
            )
        endif()
    endforeach()
endfunction()

################################# cc_set_if_undefined ###################################
macro(cc_set_if_undefined varname value)
    if(NOT DEFINED ${varname})
        set(${varname} ${value})
    endif()
endmacro()


################################# cocos_source_files ###################################
macro(cocos_source_files)
    set(list_var "${ARGN}")
    set(TWAE ON)
    set(ACCEPT_MN OFF)
    set(MODULE_NAME "COCOS")
    set(NO_UBUILD OFF)
    foreach(src IN LISTS list_var)
        if(ACCEPT_MN)
            set(MODULE_NAME "${src}")
            set(ACCEPT_MN OFF)
        elseif("NO_WERROR" STREQUAL "${src}")
            set(TWAE OFF)
        elseif("MODULE" STREQUAL "${src}")
            set(ACCEPT_MN ON)
        elseif("NO_UBUILD" STREQUAL "${src}")
            set(NO_UBUILD ON)
        else()
            if(IS_ABSOLUTE "${src}")
                set(fp "${src}")
            else()
                set(fp "${CWD}/${src}")
            endif()
            get_source_file_property(IS_GENERATED ${fp} GENERATED)
            if(EXISTS ${fp} OR ${IS_GENERATED})
                if("${fp}" MATCHES "\\.(cpp|mm|c|m)\$" AND TWAE)
                     set_source_files_properties("${fp}" PROPERTIES
                         COMPILE_FLAGS "${WERROR_FLAGS}"
                     )
                endif()
                if("${fp}" MATCHES "\\.(cpp|mm|c|m)\$" AND NO_UBUILD)
                    set_source_files_properties("${fp}" PROPERTIES
                         SKIP_UNITY_BUILD_INCLUSION ON
                    )
                endif()
                list(APPEND ${MODULE_NAME}_SOURCE_LIST "${fp}")
            else()
                message(FATAL_ERROR "Cocos souce file not exists: \"${src}\", is generated ${IS_GENERATED}")
            endif()
            set(TWAE ON)
            set(NO_UBUILD OFF)
        endif()
    endforeach()
endmacro()

################################# inspect_values ###################################
function(cc_inspect_values)
    set(list_var "${ARGN}")
    foreach(src IN LISTS list_var)
        set(opv ${${src}})
        message(STATUS "OPTION ${src}:\t${opv}")
    endforeach()
endfunction()

function(cc_parse_cfg_include_files cfg_file output_var)
    file(STRINGS ${cfg_file} my_lines)
    set(include_pattern "^%include *\"([^\"]*)\" *$")
    set(include_files "")
    foreach(line ${my_lines})
        if(line MATCHES ${include_pattern})
            # keep syncing with SWIG_ARGS
            set(include_file ${CMAKE_CURRENT_LIST_DIR}/cocos/${CMAKE_MATCH_1})
            set(include_file2 ${CMAKE_CURRENT_LIST_DIR}/${CMAKE_MATCH_1})
            if(EXISTS ${include_file})
                list(APPEND include_files ${include_file})
            elseif(EXISTS ${include_file2})
                list(APPEND include_files ${include_file2})
            else()
                message(FATAL_ERROR "%include ${include_file}:  file not found")
            endif()
        endif()
    endforeach()
    set(${output_var} ${include_files} PARENT_SCOPE)
endfunction()

function(cc_gen_swig_files cfg_directory output_dir)
    file(MAKE_DIRECTORY "${output_dir}")
    if(${CMAKE_HOST_SYSTEM_NAME} MATCHES "Windows")
        set(SWIG_DIR ${EXTERNAL_ROOT}/win64/bin/swig) 
        set(SWIG_EXEC ${SWIG_DIR}/bin/swig.exe)
    elseif(${CMAKE_HOST_SYSTEM_NAME} MATCHES "Darwin")
        set(SWIG_DIR ${EXTERNAL_ROOT}/mac/bin/swig) 
        set(SWIG_EXEC ${SWIG_DIR}/bin/swig)
    elseif(${CMAKE_HOST_SYSTEM_NAME} STREQUAL "Linux")
        set(SWIG_DIR ${EXTERNAL_ROOT}/linux/bin/swig) 
        set(SWIG_EXEC ${SWIG_DIR}/bin/swig)
    else()
        message(FATAL_ERROR "swig is not supported on current platform!")
    endif()

    set(SWIG_ARGS
        -c++
        -cocos
        -fvirtual
        -noexcept
        -cpperraswarn
        -D__clang__
        -Dfinal= 
        -DCC_PLATFORM=3
        -Dconstexpr=const
        -DCC_PLATFORM_ANDROID=3
        -I${SWIG_DIR}/share/swig/4.1.0/javascript/cocos
        -I${SWIG_DIR}/share/swig/4.1.0
        -I${CMAKE_CURRENT_LIST_DIR}/
        -I${CMAKE_CURRENT_LIST_DIR}/cocos
        -o
    )
    file(GLOB cfg_files ${cfg_directory}/*.i)

    list(FILTER cfg_files EXCLUDE REGEX ".*template.*")
    foreach(cfg ${cfg_files})

        set(dep_files)
        get_filename_component(mod_name ${cfg} NAME_WE)
        set(output_file_tmp ${output_dir}/temp/jsb_${mod_name}_auto.cpp)
        set(output_file ${output_dir}/jsb_${mod_name}_auto.cpp)

        set(output_hfile_tmp ${output_dir}/temp/jsb_${mod_name}_auto.h)
        set(output_hfile ${output_dir}/jsb_${mod_name}_auto.h)

        cc_parse_cfg_include_files(${cfg} dep_files)

        add_custom_command(
            OUTPUT
                ${output_hfile}
                ${output_file}
            COMMAND ${CMAKE_COMMAND} -E echo "Running swig with config file ${cfg} ..."
            COMMAND ${CMAKE_COMMAND} -E make_directory ${output_dir}/temp
            COMMAND ${SWIG_EXEC} ${SWIG_ARGS}
                ${output_file_tmp}
                ${cfg}
            COMMAND
                ${CMAKE_COMMAND} -E copy_if_different ${output_file_tmp} ${output_file}
            COMMAND
                ${CMAKE_COMMAND} -E copy_if_different ${output_hfile_tmp} ${output_hfile}
            DEPENDS ${cfg} ${dep_files}
            WORKING_DIRECTORY ${CMAKE_CURRENT_LIST_DIR}/..
        )
        set_source_files_properties(${output_file}
            PROPERTIES 
            GENERATED TRUE
            LOCATION ${output_file}
        )
        get_source_file_property(IS_GENERATED ${output_file} GENERATED)

    endforeach()
endfunction(cc_gen_swig_files)

function(cc_set_target_property target_name property value)
    set_target_properties(${target_name} PROPERTIES CC_${property} ${value})
endfunction()

function(cc_get_target_property output target_name property)
    get_target_property(output ${target_name} ${property})
endfunction()

function(cc_redirect_property target from_property to_property)
    cc_get_target_property(output ${target} ${from_property})
    if(output)
        set_target_properties(${target_name} PROPERTIES
            ${to_property} ${output}
        )
    endif()
endfunction()

if(NOT DEFINED NODE_EXECUTABLE)
    if(DEFINED EDITOR_NODEJS)
        set(NODE_EXECUTABLE ${EDITOR_NODEJS})
    elseif(DEFINED ENV{NODE_EXECUTABLE})
        set(NODE_EXECUTABLE $ENV{NODE_EXECUTABLE})
        message(STATUS "set NODE_EXECUTABLE by env")
    else() 
        find_program(NODE_EXECUTABLE NAMES node)
    endif()
endif()
if(NOT DEFINED TSC_EXECUTABLE)
    find_program(TSC_EXECUTABLE NAMES tsc)
endif()
if(NOT DEFINED CCACHE_EXECUTABLE)
    find_program(CCACHE_EXECUTABLE NAMES ccache)
endif()

## predefined configurations for game applications
include(${CMAKE_CURRENT_LIST_DIR}/../../templates/cmake/common.cmake)
if(APPLE)
    include(${CMAKE_CURRENT_LIST_DIR}/../../templates/cmake/apple.cmake)
elseif(WINDOWS)
    include(${CMAKE_CURRENT_LIST_DIR}/../../templates/cmake/windows.cmake)
elseif(LINUX)
    include(${CMAKE_CURRENT_LIST_DIR}/../../templates/cmake/linux.cmake)
elseif(ANDROID)
    include(${CMAKE_CURRENT_LIST_DIR}/../../templates/cmake/android.cmake)
elseif(OPENHARMONY)
    include(${CMAKE_CURRENT_LIST_DIR}/../../templates/cmake/openharmony.cmake)
elseif(OHOS)
    include(${CMAKE_CURRENT_LIST_DIR}/../../templates/cmake/ohos.cmake)
elseif(QNX)
elseif(EMSCRIPTEN)
else()
    message(FATAL_ERROR "Unhandled platform specified cmake utils!")
endif()
