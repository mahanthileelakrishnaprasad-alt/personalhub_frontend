import React from 'react'
import { Link } from 'react-router-dom'

export default function Pending() {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',padding:16}}>
      <div className="card" style={{textAlign:'center',maxWidth:400}}>
        <div style={{fontSize:40,marginBottom:12}}>⏳</div>
        <h2 style={{fontSize:20,fontWeight:700,marginBottom:8}}>Waiting for Approval</h2>
        <p style={{color:'var(--text2)',fontSize:14,marginBottom:20}}>
          Your account has been created but needs to be approved by an admin before you can access PersonalHub.
        </p>
        <Link to="/login"><button className="btn-secondary">Back to Login</button></Link>
      </div>
    </div>
  )
}
