
"use client";

export default function StreakCard(){

    return(

        <div className="side-card">

            <h3>Sequência</h3>

            <div className="streak-icon">

                <img
                src="/header/fire.png"
                alt="Streak"
                width={80}
                height={80}
                />

            </div>

            <h1>12 dias</h1>

            <p>

                Continue estudando para manter sua sequência.

            </p>

            <div className="week">

                <span className="active"></span>
                <span className="active"></span>
                <span className="active"></span>
                <span className="active"></span>
                <span className="active"></span>
                <span></span>
                <span></span>

            </div>

        </div>

    )

}
