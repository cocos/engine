#include "Vector2.h"
#include <math.h>
namespace spine {

Vector2::Vector2(): x(0), y(0) {

}

Vector2::Vector2(float x, float y) {
    this->x = x;
    this->y = y;
}

Vector2::~Vector2() {}

void Vector2::setX(float x) {
    this->x = x;
}
     
float Vector2::getX() {
    return x;
}

void Vector2::setY(float y) {
    this->y = y;
}

float Vector2::getY() {
    return y;
}

Vector2& Vector2::set(float x, float y) {
    this->setX(x);
    this->setY(y);
    return *this;
}

float Vector2::length() {
    return sqrt(x * x + y * y);
}

Vector2& Vector2::normalize() {
    float invLen = 1.F / length();
    this->setX(x * invLen);
    this->setY(y * invLen);
    return *this;
}
}