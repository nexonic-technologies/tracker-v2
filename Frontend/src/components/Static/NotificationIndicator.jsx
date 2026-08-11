/* eslint-disable no-unused-vars */
import {useState, useEffect} from "react";
import { useNotification } from "../../context/notificationProvider";
import {MdNotificationsActive, MdNotificationsNone} from "react-icons/md";

const NotificationIndicator = () => {
  const { unReadCount } = useNotification();

  return (
    <div className="relative">
      {unReadCount > 0 ? (
        <>
          <MdNotificationsActive size={28} className="cursor-pointer" />          <div className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
            {unReadCount}
          </div>
        </>
      ) : (
        <MdNotificationsNone size={28} className="cursor-pointer align-center" />
      )}
    </div>
  );
};

export default NotificationIndicator;
