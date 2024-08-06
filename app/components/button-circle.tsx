import React from 'react';
// import { CopyIcon } from '@icons'; // Adjust this import based on where your icons are located

type ButtonCircleProps = {
  textClass?: string;
  text?: string;
  icon: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean
};

const ButtonCircle: React.FC<ButtonCircleProps> = ({ textClass = "", text, icon, className = "", ...props }) => {
  return (
    <div className={`group inline-flex items-center ${className}`} onClick={()=> {!props?.disabled ? props?.onClick() : null}}>
      {icon}
      {text && (
        <span className={`hidden group-hover:inline transform transition-transform duration-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1  ${textClass}`}>
          {text}
        </span>
      )}
    </div>
  );
};

export default ButtonCircle;
