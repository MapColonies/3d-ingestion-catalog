{{/*
Expand the name of the chart.
*/}}
{{- define "catalog.name" -}}
{{- default .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "catalog.fullname" -}}
{{- $name := default .Chart.Name }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "catalog.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "catalog.labels" -}}
helm.sh/chart: {{ include "catalog.chart" . }}
{{ include "catalog.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "catalog.selectorLabels" -}}
app.kubernetes.io/name: {{ include "catalog.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Returns the environment from the chart's values if exists or from global, defaults to development
*/}}
{{- define "catalog.environment" -}}
{{- if .Values.environment }}
    {{- .Values.environment -}}
{{- else -}}
    {{- .Values.global.environment | default "development" -}}
{{- end -}}
{{- end -}}

{{/*
Returns the cloud provider name from the chart's values if exists or from global, defaults to minikube
*/}}
{{- define "catalog.cloudProviderFlavor" -}}
{{- if .Values.cloudProvider.flavor }}
    {{- .Values.cloudProvider.flavor -}}
{{- else -}}
    {{- .Values.global.cloudProvider.flavor | default "minikube" -}}
{{- end -}}
{{- end -}}

{{/*
Returns the tag of the chart.
*/}}
{{- define "catalog.tag" -}}
{{- default (printf "v%s" .Chart.AppVersion) .Values.image.tag }}
{{- end }}

{{/*
Returns the cloud provider docker registry url from the chart's values if exists or from global
*/}}
{{- define "catalog.cloudProviderDockerRegistryUrl" -}}
{{- if .Values.cloudProvider.dockerRegistryUrl }}
    {{- printf "%s/" .Values.cloudProvider.dockerRegistryUrl -}}
{{- else -}}
    {{- printf "%s/" .Values.global.cloudProvider.dockerRegistryUrl -}}
{{- end -}}
{{- end -}}

{{/*
Returns the tracing url from the chart's values if exists or from global
*/}}
{{- define "catalog.tracingUrl" -}}
{{- if .Values.env.tracing.url }}
    {{- .Values.env.tracing.url -}}
{{- else -}}
    {{- .Values.global.tracing.url -}}
{{- end -}}
{{- end -}}

{{/*
Returns the tracing url from the chart's values if exists or from global
*/}}
{{- define "catalog.metricsUrl" -}}
{{- if .Values.env.metrics.url }}
    {{- .Values.env.metrics.url -}}
{{- else -}}
    {{- .Values.global.metrics.url -}}
{{- end -}}
{{- end -}}

{{/*
Returns the cloud provider image pull secret name from the chart's values if exists or from global
*/}}
{{- define "catalog.cloudProviderImagePullSecretName" -}}
{{- if .Values.cloudProvider.imagePullSecretName }}
    {{- .Values.cloudProvider.imagePullSecretName -}}
{{- else if .Values.global.cloudProvider.imagePullSecretName -}}
    {{- .Values.global.cloudProvider.imagePullSecretName -}}
{{- end -}}
{{- end -}}
