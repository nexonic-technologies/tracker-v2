'use client';

import { useState } from 'react';

interface ProfileImageProps {
  profileImage?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  px?: number;
  title?: string;
  className?: string;
}

const ProfileImage = ({
  profileImage,
  firstName,
  lastName,
  size = 'md',
  px,
  title,
  className = ''
}: ProfileImageProps) => {
  const [imageError, setImageError] = useState(false);

  const sizes = {
    xs: 'w-8 h-8 text-xs',
    sm: 'w-12 h-12 text-sm',
    md: 'w-16 h-16 text-lg',
    lg: 'w-24 h-24 text-xl',
    xl: 'w-32 h-32 text-2xl'
  };

  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return '';
    
    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
      return imagePath;
    }

    if (imagePath.includes('serve/')) {
      return `/api/files/${imagePath}`;
    }

    const filename = imagePath.split('/').pop() || imagePath;
    return `/api/files/render/profile/${filename}`;
  };

  const getInitials = () => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return (first + last).toUpperCase() || '?';
  };

  const sizeClass = px ? '' : sizes[size];
  const sizeStyle = px ? { width: px, height: px } : {};
  const showImage = profileImage && !imageError;

  return showImage ? (
    <img
      src={getImageUrl(profileImage!)}
      alt={title || 'Profile'}
      title={title}
      className={`${sizeClass} rounded-full object-cover flex-shrink-0 border border-neutral-200/20 shadow-xs ${className}`}
      style={sizeStyle}
      onError={() => setImageError(true)}
    />
  ) : (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center flex-shrink-0 border border-neutral-200/20 bg-linear-to-br from-indigo-500 to-purple-600 text-white font-semibold shadow-xs ${className}`}
      style={{ ...sizeStyle, ...(px ? { fontSize: px * 0.38 } : {}) }}
      title={title}
    >
      <span className="font-semibold text-white">
        {getInitials()}
      </span>
    </div>
  );
};

export default ProfileImage;
