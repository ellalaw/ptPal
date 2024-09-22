import React from 'react'

export default function ProgressBar({ progress }) {
    return (
        <div className="w-full bg-gray-200 rounded-full h-4">
            <div
                className="bg-blue-600 h-4 rounded-full transition-all duration-500 ease-in-out"
                style={{ width: `${progress}%` }}
            ></div>
        </div>
    )
}