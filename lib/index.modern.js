import{verifyPresentation as e,verifyCredential as t}from"did-jwt-vc";import{getResolver as r}from"infra-did-resolver";import i from"infra-did-js";function s(){return(s=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var r=arguments[t];for(var i in r)Object.prototype.hasOwnProperty.call(r,i)&&(e[i]=r[i])}return e}).apply(this,arguments)}function n(e,t){return t()}const a=new RegExp("^did:([a-zA-Z0-9_]+):([a-zA-Z0-9_.%-]+(:[a-zA-Z0-9_.%-]+)*)((;[a-zA-Z0-9_.:%-]+=[a-zA-Z0-9_.:%-]*)*)(/[^#?]*)?([?][^#]*)?(#.*)?$");function o(e){if(""===e||!e)return null;const t=e.match(a);if(t){const r={did:`did:${t[1]}:${t[2]}`,method:t[1],id:t[2],didUrl:e};if(t[4]){const e=t[4].slice(1).split(";");r.params={};for(const t of e){const e=t.split("=");r.params[e[0]]=e[1]}}return t[6]&&(r.path=t[6]),t[7]&&(r.query=t[7].slice(1)),t[8]&&(r.fragment=t[8].slice(1)),r}return null}const d={didResolutionMetadata:{},didDocument:null,didDocumentMetadata:{}};function c(e){return async(t,r,i)=>{try{const n=await e(t,r,i);return s({},d,{didResolutionMetadata:{contentType:"application/did+ld+json"},didDocument:n})}catch(e){return s({},d,{didResolutionMetadata:{error:"notFound",message:e.toString()}})}}}class l{constructor(e={},t={}){this.registry=e,this.cache=!0===t.cache?function(){const e=new Map;return async(t,r)=>{var i;if(t.params&&"true"===t.params["no-cache"])return await r();const s=e.get(t.didUrl);if(void 0!==s)return s;const n=await r();return"notFound"!==(null==(i=n.didResolutionMetadata)?void 0:i.error)&&e.set(t.didUrl,n),n}}():t.cache||n,t.legacyResolvers&&Object.keys(t.legacyResolvers).map(e=>{this.registry[e]||(this.registry[e]=c(t.legacyResolvers[e]))})}async resolve(e,t={}){const r=o(e);if(null===r)return s({},d,{didResolutionMetadata:{error:"invalidDid"}});const i=this.registry[r.method];return i?this.cache(r,()=>i(r.did,r,this,t)):s({},d,{didResolutionMetadata:{error:"unsupportedDidMethod"}})}}export default class{constructor(e){this.resolver=e.resolver?e.resolver:new l(r(e.networkConfig)),this.did=e.did?e.did:i.createPubKeyDIDsecp256k1("01").did,this.knownIssuer=e.knownIssuer}ready(){return this.challenge=this.generateChallenge(),{challenge:this.challenge,aud:this.did}}generateChallenge(){return i.createPubKeyDIDsecp256k1("01").did}async isValidVP(t){const r=await e(t,this.resolver,{challenge:this.challenge,audience:this.did}),i=r.payload.vp.VerifiedCredential,s=r.payload.signer;if(this.isRevoked(s.did))throw new Error("Deactivated Presenter");return i.map(e=>this.isValidVC(e,s.did),this).reduce((e,t)=>e&&t,!0)}async isValidVC(e,r){const i=await t(e,this.resolver);if(r&&i.payload.sub!==r)throw new Error("Signer is not the subject of VC");if(this.isKnownIssuer(i.issuer))throw new Error("Unknown Issuer");if(this.isRevoked(i.issuer))throw new Error("Deactivated Issuer");if(this.isRevoked(i.payload.vc.id))throw new Error("Revoked VC");return!0}async isRevoked(e){return!!(await this.resolver.resolve(e)).didDocumentMetadata.deactivated}isKnownIssuer(e){for(const t in this.knownIssuer)if(this.knownIssuer[t]===e)return!0;return!1}}
//# sourceMappingURL=index.modern.js.map