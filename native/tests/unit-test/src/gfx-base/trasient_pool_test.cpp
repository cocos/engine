/****************************************************************************
Copyright (c) 2022 Xiamen Yaji Software Co., Ltd.

http://www.cocos2d-x.org

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
****************************************************************************/

#include "gtest/gtest.h"
#include "GFXDeviceManager.h"
#include <memory>

class GFXTest : public ::testing::Test {
public:
    static void SetUpTestSuite()
    {
//        if (!device) {
//            device.reset(cc::gfx::DeviceManager::create());
//        }
    }

    static void TearDownTestSuite()
    {
//        device.reset();
    }

    void SetUp()
    {
    }

    void TearDown()
    {
    }

    static std::unique_ptr<cc::gfx::Device> device;
};

std::unique_ptr<cc::gfx::Device> GFXTest::device;

TEST_F(GFXTest, TransientPoolTest) {
//    auto device = GFXTest::device.get();
//
//    cc::IntrusivePtr<cc::gfx::TransientPool> pool = device->createTransientPool({});
//
//    cc::gfx::BufferInfo bufferInfo = {};
//    bufferInfo.size  = 128;
//    bufferInfo.usage = cc::gfx::BufferUsageBit::STORAGE;
//    bufferInfo.flags = cc::gfx::BufferFlagBit::TRANSIENT;
//    bufferInfo.memUsage = cc::gfx::MemoryUsageBit::DEVICE;
//    cc::IntrusivePtr<cc::gfx::Buffer> buffer1 = pool->requestBuffer(bufferInfo);
//    pool->resetBuffer(buffer1);
//
//    cc::IntrusivePtr<cc::gfx::Buffer> buffer2 = pool->requestBuffer(bufferInfo);
//    pool->resetBuffer(buffer2);
}
