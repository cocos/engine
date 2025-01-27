

macro(cc_apple_set_launch_type target_name)
    if("${CMAKE_VERSION}" VERSION_GREATER_EQUAL "3.25.0" AND DEFINED LAUNCH_TYPE)
        set_target_properties(${target_name} PROPERTIES
            XCODE_GENERATE_SCHEME ON
            XCODE_SCHEME_LAUNCH_CONFIGURATION "${LAUNCH_TYPE}"
        )

        if("${LAUNCH_TYPE}" STREQUAL "Release")
            set_target_properties(${target_name} PROPERTIES
                XCODE_SCHEME_ENABLE_GPU_API_VALIDATION OFF
                XCODE_SCHEME_ENABLE_GPU_SHADER_VALIDATION OFF
            )
        endif()
    endif()
endmacro()

macro(cc_ios_before_target _target_name)

    if((NOT DEFINED CC_EXECUTABLE_NAME) OR "${CC_EXECUTABLE_NAME}" STREQUAL "")
        if(${APP_NAME} MATCHES "^[_0-9a-zA-Z-]+$")
            set(CC_EXECUTABLE_NAME ${APP_NAME}-mobile)
        else()
            set(CC_EXECUTABLE_NAME CocosGame)
        endif()
    endif()

    if(EXECUTABLE_NAME)
        set(EXECUTABLE_NAME ${CC_EXECUTABLE_NAME})
    endif()

    list(APPEND CC_UI_RESOURCES
        ${CC_PROJECT_DIR}/LaunchScreenBackground.png
        ${CC_PROJECT_DIR}/Images.xcassets
        ${CC_PROJECT_DIR}/Base.lproj/Localizable.strings
        ${CC_PROJECT_DIR}/Base.lproj/LaunchScreen.storyboard
    )
    list(APPEND CC_PROJ_SOURCES
        ${CC_UI_RESOURCES}
    )

    if(NOT EXISTS ${CC_PROJECT_DIR}/LaunchScreenBackground.png)
        if(USE_PORTRAIT)
            configure_file(${CC_PROJECT_DIR}/LaunchScreenBackgroundPortrait.png ${CC_PROJECT_DIR}/LaunchScreenBackground.png COPYONLY)
        else()
            configure_file(${CC_PROJECT_DIR}/LaunchScreenBackgroundLandscape.png ${CC_PROJECT_DIR}/LaunchScreenBackground.png COPYONLY)
        endif()
    endif()

    if(NOT CUSTOM_COPY_RESOURCE_HOOK)
        cc_include_resources(${RES_DIR}/data CC_ASSET_FILES)
    endif()

    source_group(TREE ${RES_DIR}/data PREFIX "Resources" FILES ${CC_ASSET_FILES})
    source_group(TREE ${CC_PROJECT_DIR} PREFIX "Source Files" FILES ${CC_PROJ_SOURCES})
    source_group(TREE ${CC_PROJECT_DIR}/../common PREFIX "Source Files" FILES ${CC_COMMON_SOURCES})

    # # values used in Info.plist templates
    set(PRODUCT_NAME ${APP_NAME})

    list(APPEND CC_PROJ_SOURCES
        ${CC_PROJECT_DIR}/AppDelegate.mm
        ${CC_PROJECT_DIR}/AppDelegate.h
        ${CC_PROJECT_DIR}/service/SDKWrapper.m
        ${CC_PROJECT_DIR}/service/SDKWrapper.h
        ${CC_PROJECT_DIR}/main.mm
        ${CC_PROJECT_DIR}/ViewController.mm
        ${CC_PROJECT_DIR}/ViewController.h
    )

    list(APPEND CC_ALL_SOURCES ${CC_PROJ_SOURCES} ${CC_ASSET_FILES} ${CC_COMMON_SOURCES})
    cc_common_before_target(${CC_EXECUTABLE_NAME})
endmacro()

macro(cc_ios_after_target _target_name)
    set_target_properties(${CC_EXECUTABLE_NAME} PROPERTIES
        MACOSX_BUNDLE 1
        MACOSX_BUNDLE_INFO_PLIST "${CC_PROJECT_DIR}/Info.plist"
        RESOURCE "${CC_UI_RESOURCES}"
        MACOSX_DEPLOYMENT_TARGET "${TARGET_IOS_VERSION}"
        XCODE_ATTRIBUTE_IPHONEOS_DEPLOYMENT_TARGET "${TARGET_IOS_VERSION}"
        XCODE_ATTRIBUTE_DEVELOPMENT_TEAM "${DEVELOPMENT_TEAM}"
        OSX_ARCHITECTURES "arm64;x86_64"
        XCODE_ATTRIBUTE_CODE_SIGN_IDENTITY "iPhone Developer"
        XCODE_ATTRIBUTE_ASSETCATALOG_COMPILER_APPICON_NAME "AppIcon"
        XCODE_ATTRIBUTE_ASSETCATALOG_COMPILER_LAUNCHSTORYBOARD_NAME "LaunchScreen"
        XCODE_ATTRIBUTE_ENABLE_BITCODE NO
        XCODE_ATTRIBUTE_ONLY_ACTIVE_ARCH YES
        IOS_INSTALL_COMBINED YES
        XCODE_ATTRIBUTE_SKIP_INSTALL NO
        XCODE_ATTRIBUTE_INSTALL_PATH "$(LOCAL_APPS_DIR)"
        XCODE_GENERATE_SCHEME ON
    )

    cc_apple_set_launch_type(${CC_EXECUTABLE_NAME})

    # # exclude arm64 arch and specify x86_64 for iphonesimulator by default, this will apply to both target.
    set(CMAKE_XCODE_ATTRIBUTE_EXCLUDED_ARCHS[sdk=iphonesimulator*] "arm64")
    set(CMAKE_XCODE_ATTRIBUTE_ARCHS[sdk=iphoneos*] "arm64")
    set(CMAKE_XCODE_ATTRIBUTE_ARCHS[sdk=iphonesimulator*] "x86_64")
    set(CMAKE_XCODE_ATTRIBUTE_VALID_ARCHS[sdk=iphoneos*] "arm64")
    set(CMAKE_XCODE_ATTRIBUTE_VALID_ARCHS[sdk=iphonesimulator*] "x86_64")

    set(CMAKE_XCODE_ATTRIBUTE_TARGETED_DEVICE_FAMILY "1,2")

    target_link_libraries(${CC_EXECUTABLE_NAME} ${ENGINE_NAME})

    target_include_directories(${CC_EXECUTABLE_NAME} PRIVATE
        ${CC_PROJECT_DIR}/../common/Classes
        ${CC_PROJECT_DIR}/service
    )
    cc_common_after_target(${CC_EXECUTABLE_NAME})
endmacro()

macro(cc_mac_before_target _target_name)


    if((NOT DEFINED CC_EXECUTABLE_NAME) OR "${CC_EXECUTABLE_NAME}" STREQUAL "")
        if(${APP_NAME} MATCHES "^[_0-9a-zA-Z-]+$")
            set(CC_EXECUTABLE_NAME ${APP_NAME}-desktop)
        else()
            message(STATUS "???///// #  ${APP_NAME} ")
            set(CC_EXECUTABLE_NAME CocosGame)
        endif()
    endif()

    if(EXECUTABLE_NAME)
        set(EXECUTABLE_NAME ${CC_EXECUTABLE_NAME})
    endif()

    set(CMAKE_OSX_DEPLOYMENT_TARGET ${TARGET_OSX_VERSION})

    list(APPEND CC_UI_RESOURCES
        ${CC_PROJECT_DIR}/Assets.xcassets
        ${CC_PROJECT_DIR}/Icon.icns
    )
    list(APPEND CC_PROJ_SOURCES
        ${CC_PROJECT_DIR}/main.mm
        ${CC_UI_RESOURCES}
    )

    if(NOT CUSTOM_COPY_RESOURCE_HOOK)
        cc_include_resources(${RES_DIR}/data CC_ASSET_FILES)
    endif()

    # # values used in Info.plist templates
    set(PRODUCT_NAME ${APP_NAME})

    if("${TARGET_OSX_VERSION}" VERSION_GREATER_EQUAL "11.0")
        add_definitions(-DMAC_MEMORY_LESS_TEXTURE_SUPPORT=1)
    endif()

    source_group(TREE ${RES_DIR}/data PREFIX "Resources" FILES ${CC_ASSET_FILES})
    source_group(TREE ${CC_PROJECT_DIR} PREFIX "Source Files" FILES ${CC_PROJ_SOURCES})
    source_group(TREE ${CC_PROJECT_DIR}/../common PREFIX "Source Files" FILES ${CC_COMMON_SOURCES})

    list(APPEND CC_ALL_SOURCES ${CC_PROJ_SOURCES} ${CC_ASSET_FILES} ${CC_COMMON_SOURCES})
    cc_common_before_target(${CC_EXECUTABLE_NAME})
endmacro()

macro(cc_mac_after_target _target_name)
    target_link_libraries(${CC_EXECUTABLE_NAME} ${ENGINE_NAME})
    target_include_directories(${CC_EXECUTABLE_NAME} PRIVATE
        ${CC_PROJECT_DIR}/../common/Classes
    )

    if(USE_SERVER_MODE)
        if(EXISTS ${RES_DIR}/data/jsb-adapter)
            set(bin_dir ${CMAKE_CURRENT_BINARY_DIR}/${CMAKE_CFG_INTDIR})
            add_custom_target(copy_resource ALL
                COMMAND ${CMAKE_COMMAND} -E echo "Copying resources to ${bin_dir}"
                COMMAND ${CMAKE_COMMAND} -E make_directory ${bin_dir}/Resources
                COMMAND ${CMAKE_COMMAND} -E copy_directory "${RES_DIR}/data/" "${bin_dir}/Resources/"
                COMMAND ${CMAKE_COMMAND} -E echo "Copying resources done!"
            )
            add_dependencies(${CC_EXECUTABLE_NAME} copy_resource)
            set_target_properties(copy_resource PROPERTIES FOLDER Utils)
        endif()
    else()
        set_target_properties(${CC_EXECUTABLE_NAME} PROPERTIES
            OSX_ARCHITECTURES "x86_64;arm64"
            XCODE_ATTRIBUTE_MACOS_DEPLOYMENT_TARGET "${TARGET_OSX_VERSION}"
            XCODE_ATTRIBUTE_ONLY_ACTIVE_ARCH YES
            XCODE_ATTRIBUTE_ASSETCATALOG_COMPILER_APPICON_NAME "AppIcon"
            XCODE_ATTRIBUTE_ASSETCATALOG_COMPILER_LAUNCHSTORYBOARD_NAME "LaunchScreen"
            MACOSX_BUNDLE 1
            RESOURCE "${CC_UI_RESOURCES}"
            MACOSX_BUNDLE_INFO_PLIST "${CC_PROJECT_DIR}/Info.plist"
            XCODE_ATTRIBUTE_SKIP_INSTALL NO
            XCODE_ATTRIBUTE_INSTALL_PATH "$(LOCAL_APPS_DIR)"
            XCODE_GENERATE_SCHEME ON
        )

        cc_apple_set_launch_type(${CC_EXECUTABLE_NAME})

        if(ENABLE_SANDBOX)
            set_target_properties(${CC_EXECUTABLE_NAME} PROPERTIES
                XCODE_ATTRIBUTE_CODE_SIGN_ENTITLEMENTS "${CC_PROJECT_DIR}/entitlements.plist"
            )
        endif()
    endif()

    cc_common_after_target(${CC_EXECUTABLE_NAME})
endmacro()
