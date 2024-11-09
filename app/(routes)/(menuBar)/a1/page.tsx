'use client';
import React from 'react'
import { useEffect, useRef, useState } from 'react';
import BottomMenuComponent from '@components/BottomMenuComponent'
import ProgressBar from '@components/ProgressBar';
import styles from '@styles/a2.module.css';
import {drawAngleOnCanvas, drawKeypoints, drawSkeleton} from '@utility/drawing';
import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';

export default function AboutUsPage() {
    const canvasRef = useRef(null);
    const imageRef = useRef(null);
    const videoRef = useRef(null);
    const [detector, setDetector] = useState(null);
    const [isCameraOn, setCamerabtnStatus] = useState(false);
    const [hipProgress, setHipProgress] = useState(0);
    const [kneeProgress, setKneeProgress] = useState(0);

    const [standarHipAngle, setStandarHipAngle] = useState(null);
    const [standarKneeAngle, setStandarkneeAngle] = useState(null);

    async function loadModel() {
        const model = poseDetection.SupportedModels.MoveNet;
        const detectorConfig = {modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING};
        const de = await poseDetection.createDetector(model, detectorConfig);
        setDetector(de);
    }

    useEffect(() => {
        if (isCameraOn) {
            loadModel();
            navigator.mediaDevices.getUserMedia({
                video: true
            }).then(stream => {
                const videoElement = videoRef.current;
                videoElement.srcObject = stream;
                videoElement.onloadeddata = () => {
                    videoElement.play();
                };
            }).catch((error) => {
                if (error.name === 'NotAllowedError') {
                  console.error('user rejected camera');
                } else {
                  console.error('error occured when call the camera', error);
                }
            });
        } else {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject;
                const tracks = stream.getTracks();
                tracks.forEach((track) => track.stop());
                setStream(null);
                videoRef.current.srcObject = null;
            }
        }
    }, [isCameraOn]);

    useEffect(() => {
        if (detector) {
            async function scanStandar () {
                const imgElement = imageRef.current;
                const standarPoses = await detector.estimatePoses(imgElement);

                const rightHip = getKeyPointInfo(standarPoses[0].keypoints, 12, 'right_hip');
                const rightKnee = getKeyPointInfo(standarPoses[0].keypoints, 14, 'right_knee');
                const rightAnkle = getKeyPointInfo(standarPoses[0].keypoints, 16, 'right_ankle');
                const kneeAngle = getKeypointAngle(rightHip, rightKnee, rightAnkle);
                setStandarkneeAngle(kneeAngle);
                console.log("standar knee:", kneeAngle);

                const rightShoulder = getKeyPointInfo(standarPoses[0].keypoints, 6, 'right_shoulder');
                const hipAngle = getKeypointAngle(rightShoulder, rightHip, rightKnee);
                setStandarHipAngle(hipAngle);
                console.log("standar hip:", hipAngle);
            }
            scanStandar();
        }
    }, [detector]);

    useEffect(() => {
        if (detector) {
            const interval = setInterval(async () => {
                const videoElement = videoRef.current;
                if (videoElement && videoElement.readyState === 4) {
                    try {
                        const poses = await detector.estimatePoses(videoElement);
                        if (poses.length === 0) return;
                        //threeDOutput(poses);
                        const canvas = canvasRef.current;
                        const ctx = canvas.getContext('2d');
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        drawKeypoints(ctx, poses);
                        const adjacentKeyPoints = poseDetection.util.getAdjacentPairs(poseDetection.SupportedModels.MoveNet);
                        drawSkeleton(ctx, poses, adjacentKeyPoints);

                        const rightHip = getKeyPointInfo(poses[0].keypoints, 12, 'right_hip');
                        const rightKnee = getKeyPointInfo(poses[0].keypoints, 14, 'right_knee');
                        const rightAnkle = getKeyPointInfo(poses[0].keypoints, 16, 'right_ankle');
                        const kneeAngle = getKeypointAngle(rightHip, rightKnee, rightAnkle);
                        drawAngleOnCanvas(ctx, rightHip, rightKnee, rightAnkle, kneeAngle);

                        const rightShoulder = getKeyPointInfo(poses[0].keypoints, 6, 'right_shoulder');
                        const hipAngle = getKeypointAngle(rightShoulder, rightHip, rightKnee);
                        drawAngleOnCanvas(ctx, rightShoulder, rightHip, rightKnee, hipAngle);

                        compareWithStandar(hipAngle, kneeAngle);
                    } catch (error) {
                        console.log(error);
                    }
                }
            }, 1000);
            return () => {
                clearInterval(interval);
            }
        }
    }, [detector, standarHipAngle]);

    function getKeyPointInfo(keypoints, index, name) {
        const kp = keypoints[index].name === name ? keypoints[index] : keypoints.find(point => point.name === name);
        return kp
    }

    function getKeypointAngle(p1, p2, p3) {
        // 2PI = 360, 1弧度 = 180/PI
        //console.log(Math.atan2(p3.y - p2.y, p3.x - p2.x) * 180 / Math.PI);
        //console.log(Math.atan2(p1.y - p2.y, p1.x - p2.x) * 180 / Math.PI);
        //console.log(p3.y - p2.y, p3.x - p2.x);
        //console.log(p1.y - p2.y, p1.x - p2.x);

        const angle = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
        //return Math.abs(angle * 180.0 / Math.PI);
        return angle * 180.0 / Math.PI;
    }

    function compareWithStandar(hipAngle, kneeAngle) {
        const averageAngle = ((standarHipAngle - hipAngle) + (standarKneeAngle - kneeAngle)) / 2;
        //console.log(Math.abs(standarHipAngle - hipAngle) / 360);
        //console.log(Math.abs(standarKneeAngle - kneeAngle) / 360);
        setHipProgress((1 - Math.abs(standarHipAngle - hipAngle) / 360) * 100);
        setKneeProgress((1 - Math.abs(standarKneeAngle - kneeAngle) / 360) * 100);
    }

    function threeDOutput(poses) {
        const keypoints = poses[0].keypoints.map(kp => [kp.x, kp.y]);
        console.log(keypoints);
    }

    return (
        <BottomMenuComponent title="Home Page">
            <div className={`${styles.clearfix}`}>
                <div className={`${styles.box_bg} float-left m-3 flex flex-col`}>
                    <img className={`${styles.display_center}`} ref={imageRef}
                        src="/standar/overheadsquat.jpg" width="358" height="480"></img>
                </div>
                <div className={`${styles.box_bg} m-3 flex flex-col float-left`}>
                    <h1 className="text-3xl font-bold mb-60 h-24">Completion</h1>
                    <ProgressBar progress={hipProgress} />
                    <p className="mt-4">hip {hipProgress}%</p>
                    <ProgressBar progress={kneeProgress} />
                    <p className="mt-4">knee {kneeProgress}%</p>
                </div>
            </div>
            <div className={`${styles.clearfix}`}>
                <canvas className={`${styles.box_bg} ${styles.video_trans} float-left m-3`} ref={canvasRef} width="640" height="480"></canvas>
                {isCameraOn ? (
                <video className={`${styles.box_bg} ${styles.video_trans} float-left m-3`} ref={videoRef} autoPlay playsInline></video>
                ) : (
                <div className={`${styles.box_bg} float-left m-3`}>video</div>
                )}
                <button className="bg-blue-300 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-full"
                    onClick={() => setCamerabtnStatus(!isCameraOn)}>
                    {isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
                </button>
            </div>
        </BottomMenuComponent>
    )
}
