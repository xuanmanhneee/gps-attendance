import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
//icon
import { RiAccountCircleFill } from 'react-icons/ri';
import { FaLock } from 'react-icons/fa';
import { FaRegEyeSlash } from 'react-icons/fa';
import { FaRegEye } from 'react-icons/fa6';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

import { ApiError, AuthErrorCode } from '@gps-attendance/shared';
import type { LoginRequest } from '@gps-attendance/shared';
import { useAuth } from '../hooks/useAuth';

const LoginPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const togglePasswordView = () => setShowPassword(!showPassword);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>();

  const { login, isLoading } = useAuth();

  const handleLogin = async (data: LoginRequest) => {
    setLoginError(null);

    try {
      await login(data);

      toast.success('Đăng nhập thành công!');

      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('LOGIN ERROR:', error);
      console.error('instanceof ApiError:', error instanceof ApiError);

      if (error instanceof ApiError) {
        switch (error.code) {
          case AuthErrorCode.INVALID_CREDENTIALS:
            setLoginError('Sai tên đăng nhập hoặc mật khẩu.');
            break;
          case AuthErrorCode.ACCOUNT_NOT_LINKED:
            setLoginError(
              'Tài khoản chưa được liên kết với hồ sơ người dùng.',
            );
            break;
          case AuthErrorCode.ROLE_NOT_ALLOWED:
            setLoginError(
              'Tài khoản không có quyền đăng nhập vào trang quản trị.',
            );
            break;
          default: {
            const detail = error.message || 'Máy chủ trả về lỗi không xác định.';
            setLoginError(`Đăng nhập thất bại (${error.status}): ${detail}`);
          }
        }
        toast.error(error.message);
        return;
      }
      const message = error instanceof Error ? error.message : 'Lỗi không xác định.';
      setLoginError(
        `Không thể kết nối tới máy chủ. Kiểm tra backend và địa chỉ API. Chi tiết: ${message}`,
      );
      toast.error('Không thể kết nối tới máy chủ');
    }
  };


  return (
    <div className="w-full h-screen flex items-center justify-center bg-white text-[#ddd]">
      <form
        className="w-[90%] max-w-sm md:max-w-md lg:max-w-md p-5 bg-black
        flex-col flex items-center gap-3 rounded-xl shadow-slate-500 shadow-lg"
        onSubmit={handleSubmit(handleLogin)}
      >
        <h1 className="text-lg md:text-xl font-semibold text-center">
          Hệ thống quản lý điểm danh <br /> Trường Đại học Đà Lạt
        </h1>
        <div className="w-full flex flex-col gap-3">
          <div className="w-full flex items-center gap-2 bg-gray-800 p-2 rounded-xl">
            <RiAccountCircleFill />
            <input
              type="text"
              placeholder="Username"
              {...register('username', { required: 'Vui lòng nhập Username' })}
              className="bg-transparent border-0 w-full outline-none text-sm md:text-base"
            />
          </div>

          <div className="w-full flex items-center gap-2 bg-gray-800 p-2 rounded-xl relative">
            <FaLock />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              {...register('password', { required: 'Vui lòng nhập Password' })}
              className="bg-transparent border-0 w-full outline-none text-sm md:text-base"
            />
            {showPassword ? (
              <FaRegEye
                className="absolute right-5 cursor-pointer"
                onClick={togglePasswordView}
              />
            ) : (
              <FaRegEyeSlash
                className="absolute right-5 cursor-pointer"
                onClick={togglePasswordView}
              />
            )}
          </div>
          {errors.password && (
            <span className="text-red-400 text-xs text-left w-full">
              {errors.password.message}
            </span>
          )}
        </div>
        {loginError && (
          <div
            role="alert"
            className="w-full rounded-lg border border-red-500/40 bg-red-950/60 px-3 py-2 text-left text-sm text-red-200"
          >
            {loginError}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full p-2 bg-green-600 rounded-xl mt-3
                    hover:bg-green-500 text-sm md:text-base
                    disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Đang đăng nhập...' : 'Login'}
        </button>
        <div className="relative w-full flex items-center justify-center py-3">
          <div className="w-2/5 h-0.5 bg-gray-800"></div>
          <h3 className="font-lora text-xs md:text-sm px-4 text-gray-500">
            Or
          </h3>
          <div className="w-2/5 h-0.5 bg-gray-800"></div>
        </div>
        <div className="w-full flex items-center justify-center  gap-2">
          <div className="p-1 md:px-6 lg:px-10 bg-slate-700 cursor-pointer rounded-xl hover:bg-slate-800">
            <img
              src="/google-icon.png"
              alt="google-icon"
              className="w-6 md:w-8"
            />
          </div>
        </div>
      </form>
    </div>
  );
};

export default LoginPage;
