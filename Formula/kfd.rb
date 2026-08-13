class Kfd < Formula
  desc "Offline verifier and bundle tool for Kungfu Definition standards"
  homepage "https://kfd.libkungfu.dev"
  version "1.0.0-alpha.63"
  license "Apache-2.0"

  if OS.mac? && Hardware::CPU.arm?
    url "https://github.com/kungfu-systems/kfd/releases/download/v1.0.0-alpha.63/kfd-1.0.0-alpha.63-aarch64-apple-darwin.tar.gz"
    sha256 "80b1d9531e30509f038b2672bc6e85160475adbebe4e9b4033e3be7e840c91fa"
  elsif OS.mac? && Hardware::CPU.intel?
    url "https://github.com/kungfu-systems/kfd/releases/download/v1.0.0-alpha.63/kfd-1.0.0-alpha.63-x86_64-apple-darwin.tar.gz"
    sha256 "5de2fa2fe4f1ec61132279667841151e3fecd815c67ff88595c36fe5eaa31530"
  elsif OS.linux? && Hardware::CPU.arm?
    url "https://github.com/kungfu-systems/kfd/releases/download/v1.0.0-alpha.63/kfd-1.0.0-alpha.63-aarch64-unknown-linux-gnu.tar.gz"
    sha256 "dd23d74c5010218e9336d5422897b8504e47d722fc6697d72f18396401bcc941"
  elsif OS.linux? && Hardware::CPU.intel?
    url "https://github.com/kungfu-systems/kfd/releases/download/v1.0.0-alpha.63/kfd-1.0.0-alpha.63-x86_64-unknown-linux-gnu.tar.gz"
    sha256 "e85c3071958b1e665b73c20555b874a9bfdf2090ec7b343afe7fa98ae43cacf2"
  else
    odie "KFD Homebrew formula supports macOS and Linux on arm64 and x86_64."
  end

  def install
    payload_root = ([buildpath] + buildpath.children.select(&:directory?)).find do |candidate|
      (candidate/"kfd").file?
    end
    odie "KFD native archive layout is invalid." if payload_root.nil?

    bin.install payload_root/"kfd"
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/kfd --version")
    assert_match "usage:", shell_output("#{bin}/kfd --help")
  end
end
