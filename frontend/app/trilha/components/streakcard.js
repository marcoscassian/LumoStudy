
"use client";

import { Flame } from "lucide-react";

export default function StreakCard(){

    return(

        <div className="side-card">

            <h3>Sequência</h3>

            <div className="streak-icon">

                <Flame size={45}/>

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
