class Anuvaad < Formula
  desc "AI-powered code translation, explanation, and architectural review CLI"
  homepage "https://getanuvaad.com"
  url "https://registry.npmjs.org/@anuvaad/cli/-/cli-1.0.0.tgz"
  version "1.0.0"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *Language::Node.std_npm_install_args(libexec)
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    assert_match "1.0.0", shell_output("#{bin}/anuvaad --version")
  end
end
