{{/*
Copyright VMware, Inc.
SPDX-License-Identifier: APACHE-2.0
*/}}

{{/* vim: set filetype=mustache: */}}
{{/*
Renders a value that contains template perhaps with scope if the scope is present.
Usage:
{{ include "common.tplvalues.render" ( dict "value" .Values.path.to.the.Value "context" $ ) }}
{{ include "common.tplvalues.render" ( dict "value" .Values.path.to.the.Value "context" $ "scope" $app ) }}
*/}}
{{- define "common.tplvalues.render" -}}
{{- $value := typeIs "string" .value | ternary .value (.value | toYaml) }}
{{- if contains "{{" (toJson .value) }}
  {{- if .scope }}
      {{- tpl (cat "{{- with $.RelativeScope -}}" $value "{{- end }}") (merge (dict "RelativeScope" .scope) .context) }}
  {{- else }}
    {{- tpl $value .context }}
  {{- end }}
{{- else }}
    {{- $value }}
{{- end }}
{{- end -}}

{{/*
Merge a list of values that contains template after rendering them.
Merge precedence is consistent with http://masterminds.github.io/sprig/dicts.html#merge-mustmerge
Usage:
{{ include "common.tplvalues.merge" ( dict "values" (list .Values.path.to.the.Value1 .Values.path.to.the.Value2) "context" $ ) }}
*/}}
{{- define "common.tplvalues.merge" -}}
{{- $dst := dict -}}
{{- range .values -}}
{{- $dst = include "common.tplvalues.render" (dict "value" . "context" $.context "scope" $.scope) | fromYaml | merge $dst -}}
{{- end -}}
{{ $dst | toYaml }}
{{- end -}}

{{/*
End of usage example
*/}}

{{/*
Custom definitions
*/}}

{{- define "common.postgres.merged" -}}
{{- include "common.tplvalues.merge" ( dict "values" ( list .Values.postgres .Values.global.postgres ) "context" . ) }}
{{- end -}}

{{- define "common.ca.merged" -}}
{{- include "common.tplvalues.merge" ( dict "values" ( list .Values.ca .Values.global.ca ) "context" . ) }}
{{- end -}}

{{- define "common.podAnnotations.merged" -}}
{{- include "common.tplvalues.merge" ( dict "values" ( list .Values.podAnnotations .Values.global.podAnnotations ) "context" . ) }}
{{- end -}}

{{- define "common.extraVolumes.merged" -}}
{{- include "common.tplvalues.merge" ( dict "values" ( list .Values.extraVolumes .Values.global.extraVolumes ) "context" . ) }}
{{- end -}}

{{- define "common.sidecars.merged" -}}
{{- include "common.tplvalues.merge" ( dict "values" ( list .Values.sidecars .Values.global.sidecars ) "context" . ) }}
{{- end -}}

{{- define "common.extraVolumeMounts.merged" -}}
{{- include "common.tplvalues.merge" ( dict "values" ( list .Values.extraVolumeMounts .Values.global.extraVolumeMounts ) "context" . ) }}
{{- end -}}
