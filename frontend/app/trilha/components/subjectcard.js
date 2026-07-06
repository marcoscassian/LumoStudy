
"use client";

import { CheckCircle2, Lock, PlayCircle } from "lucide-react";

export default function SubjectCard({
  image,
  title,
  description,
  progress,
  completed,
  topics = [],
  color
}) {

  return (
    <div className={`subject-card ${color}`}>

      <div className="subject-top">

        <img
          src={image}
          alt={title}
          className="subject-image"
        />

        <div>

          <h2>{title}</h2>

          <p>{description}</p>

        </div>

      </div>

      <div className="progress-section">

        <div className="progress-bar">

          <div
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />

        </div>

        <span>{completed}</span>

      </div>

      {topics.length > 0 && (

        <div className="topics">

          {topics.map((topic, index) => (

            <div className="topic" key={index}>

              <div className="topic-left">

                {topic.status === "done" && (
                  <CheckCircle2 size={18} className="done"/>
                )}

                {topic.status === "play" && (
                  <PlayCircle size={18} className="play"/>
                )}

                {topic.status === "lock" && (
                  <Lock size={18} className="lock"/>
                )}

                <span>{topic.name}</span>

              </div>

              <span>{topic.progress}%</span>

            </div>

          ))}

        </div>

      )}

    </div>
  );

}
