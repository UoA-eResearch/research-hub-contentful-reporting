awsProfile = ''
slackChannel = "research-hub"
slackCredentials = "UoA-Slack-Access-Research-Hub"

pipeline {
    agent {
        label("uoa-buildtools-ionic")
    }

    options {
        buildDiscarder(
            logRotator(
                numToKeepStr: "3"
            )
        )
    }

    stages {
        stage("Checkout") {
            steps {
                checkout scm
                slackSend(channel: slackChannel, tokenCredentialId: slackCredentials, message: "Build Started - ${env.JOB_NAME} ${env.BUILD_NUMBER} (<${env.BUILD_URL}|Open>)")
            }
        }

        stage('AWS Credential Grab') {
            steps{
                script {
                    echo "☯ Authenticating with AWS"

                    def awsCredentialsId = ''
                    def awsTokenId = ''

                    if (env.BRANCH_NAME == 'prod') {
                        echo 'Setting variables for prod deployment'
                        awsCredentialsId = 'aws-its-prod'
                        awsTokenId = 'Access token for ITS Prod Account'
                        awsProfile = 'uoa-its-prod'
                    } else {
                        echo 'Setting variables for test deployment'
                        awsCredentialsId = 'aws-its-nonprod-access'
                        awsTokenId = 'aws-its-nonprod-token'
                        awsProfile = 'uoa-its-nonprod'
                    }

                    echo "awsProfile set to ${awsProfile}"

                    withCredentials([
                        usernamePassword(credentialsId: "${awsCredentialsId}", passwordVariable: 'awsPassword', usernameVariable: 'awsUsername'),
                        string(credentialsId: "${awsTokenId}", variable: 'awsToken')
                    ]) {
                        sh 'python3 /home/jenkins/aws_saml_login.py --idp iam.auckland.ac.nz --user $awsUsername --password $awsPassword --token $awsToken --role devops --profile ' + awsProfile
                    }
                }
            }
        }
        
        stage('Build') {
            steps {
                echo "Building content-graph-api project. Build number: ${env.BUILD_NUMBER}"
                sh "npm ci"
                echo "further build steps are handled in the deployment stage"
            }
        }
        
        stage('Run tests') {
            steps {
                echo "Testing content-graph-api project"
                script {
                    sh "npm run test-graph"
                    echo "Testing complete"
                }
            }
        }
  
        stage('Deploy') {
            steps {
                echo "Deploying content-graph-api Lambda on ${env.BRANCH_NAME}"
                script {                    
                    sh "sls --version"
                    sh "sls deploy --config graphAPI.yml --stage ${env.BRANCH_NAME} --aws-profile ${awsProfile}"
                    echo "Deploy to ${env.BRANCH_NAME} complete"
                }
            }
        }
    }
    
    post {
        success {
            echo "Jenkins job ran successfully. Deployed content-graph-api to ${env.BRANCH_NAME}"
            slackSend(channel: slackChannel, tokenCredentialId: slackCredentials, message: "😎 Build successful - ${env.JOB_NAME} ${env.BUILD_NUMBER} (<${env.BUILD_URL}|Open>)")
        }
        failure {
            echo 'Jenkins job for content-graph-api failed :('
            slackSend(channel: slackChannel, tokenCredentialId: slackCredentials, message: "😱 Build failed - ${env.JOB_NAME} ${env.BUILD_NUMBER} (<${env.BUILD_URL}|Open>)")
        }
    }
}